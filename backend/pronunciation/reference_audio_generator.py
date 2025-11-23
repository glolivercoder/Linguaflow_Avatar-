"""
ReferenceAudioGenerator - Generate native speaker reference audio using Piper TTS
Adapted from PipperTTS project structure using piper-tts via subprocess
"""

import json
import logging
import os
import subprocess
import sys
import tempfile
from pathlib import Path
from typing import Optional

import numpy as np
import soundfile as sf

logger = logging.getLogger(__name__)


class ReferenceAudioGenerator:
    """Generate reference audio files using Piper TTS via subprocess"""
    
    def __init__(self, voice_model_path: Optional[str] = None):
        """
        Initialize Piper TTS for reference audio generation
        
        Args:
            voice_model_path: Path to .onnx voice model file
                            Defaults to en_US-lessac-medium if not specified
        """
        self.references_dir = Path("references")
        self.references_dir.mkdir(exist_ok=True)
        
        # Default to en_US-lessac-medium (high quality American English voice)
        if voice_model_path is None:
            voice_model_path = self._get_default_voice()
        
        self.voice_model_path = Path(voice_model_path)
        self.config_path = self.voice_model_path.with_suffix('.onnx.json')
        self._config_data = {}
        
        logger.info(f"Using voice model: {self.voice_model_path}")
        logger.info(f"Using config: {self.config_path}")
        
        # Verify model and config exist
        if not self.voice_model_path.exists():
            raise FileNotFoundError(f"Voice model not found: {self.voice_model_path}")
        
        if not self.config_path.exists():
            raise FileNotFoundError(f"Config file not found: {self.config_path}")
        
        # Load configuration JSON
        try:
            with open(self.config_path, 'r', encoding='utf-8') as f:
                self._config_data = json.load(f)
            logger.info("✅ Piper configuration loaded successfully")
        except Exception as exc:
            logger.error(f"❌ Failed to load configuration: {exc}")
            raise
    
    @property
    def sample_rate(self) -> int:
        """Return sample rate from model config"""
        return int(self._config_data.get('audio', {}).get('sample_rate', 22050))
    
    def _get_default_voice(self) -> str:
        """
        Get path to default voice model
        
        Returns:
            Path to voice model file
        """
        # Check environment variable first
        env_model = os.getenv("PIPER_VOICE_MODEL")
        if env_model and Path(env_model).exists():
            logger.info(f"Using voice model from environment: {env_model}")
            return env_model

        # Search in local models directory
        candidates = [
            Path("models/lessac_en_us/lessac_en_us.onnx"),
            Path("models/en_US-lessac-medium.onnx"),
        ]

        # Check if we can reference PipperTTS models
        try:
            workspace_root = Path(__file__).resolve().parents[2]
            piper_models = workspace_root / "PipperTTS" / "piper" / "trained_models" / "lessac_en_us" / "lessac_en_us.onnx"
            if piper_models.exists():
                candidates.insert(0, piper_models)
        except (IndexError, Exception):
            pass

        for candidate in candidates:
            if candidate.exists():
                logger.info(f"Found voice model at: {candidate}")
                return str(candidate)

        logger.warning("Voice model not found in expected locations")
        return str(candidates[0])

    def list_available_models(self) -> list[dict[str, str | None]]:
        """Discover available Piper voice models across common directories."""

        search_dirs: list[Path] = []

        # Directory of the current active model
        try:
            search_dirs.append(self.voice_model_path.resolve().parent)
        except Exception:
            pass

        # Local project models directory
        module_dir = Path(__file__).resolve().parent
        search_dirs.append(module_dir / "models")

        # Workspace-level models directory
        try:
            workspace_root = Path(__file__).resolve().parents[2]
            search_dirs.append(workspace_root / "models")
            
            # PipperTTS trained_models directory
            piper_trained = workspace_root / "PipperTTS" / "piper" / "trained_models"
            if piper_trained.exists():
                search_dirs.append(piper_trained)
        except (IndexError, Exception):
            pass

        seen: set[str] = set()
        discovered: list[dict[str, str | None]] = []

        for directory in search_dirs:
            if not directory or not directory.exists():
                continue

            # Search for .onnx files directly in directory
            for model_file in directory.glob("*.onnx"):
                model_key = model_file.stem
                if model_key in seen:
                    continue

                seen.add(model_key)

                parts = model_key.split("_")
                language = parts[0] if parts else "unknown"
                quality = parts[-1] if len(parts) > 2 else None

                discovered.append({
                    "key": model_key,
                    "language": language,
                    "quality": quality,
                    "file_path": str(model_file.resolve()),
                })
            
            # Also search in subdirectories (PipperTTS structure)
            for subdir in directory.iterdir():
                if subdir.is_dir():
                    for model_file in subdir.glob("*.onnx"):
                        model_key = model_file.stem
                        if model_key in seen:
                            continue

                        seen.add(model_key)

                        parts = model_key.split("_")
                        language = parts[0] if parts else "unknown"
                        quality = parts[-1] if len(parts) > 2 else None

                        discovered.append({
                            "key": model_key,
                            "language": language,
                            "quality": quality,
                            "file_path": str(model_file.resolve()),
                        })

        discovered.sort(key=lambda item: (item["language"] or "", item["key"] or ""))
        return discovered

    def generate_reference_audio(
        self,
        text: str,
        output_filename: Optional[str] = None,
        speed: float = 1.0,
        volume: float = 1.0,
        voice_model_path: Optional[str] = None,
    ) -> str:
        """
        Generate reference audio file from text using Piper TTS
        
        Args:
            text: Text to synthesize
            output_filename: Optional custom filename (without .wav extension)
            speed: Speech speed (1.0 = normal, <1.0 = slower, >1.0 = faster)
            volume: Audio volume (0.0-1.0)
            voice_model_path: Optional override for the Piper voice model
        
        Returns:
            Path to generated audio file
        """
        try:
            # Determine which voice model to use
            model_path = Path(voice_model_path) if voice_model_path else self.voice_model_path
            config_path = model_path.with_suffix('.onnx.json')
            
            if not model_path.exists():
                raise FileNotFoundError(f"Voice model not found: {model_path}")
            if not config_path.exists():
                raise FileNotFoundError(f"Config file not found: {config_path}")

            # Generate filename if not provided
            if output_filename is None:
                # Use first 50 chars of text, sanitize for filename
                safe_text = "".join(c if c.isalnum() or c.isspace() else "_" for c in text[:50])
                safe_text = safe_text.strip().replace(" ", "_")
                output_filename = f"ref_{safe_text}"
            
            output_path = self.references_dir / f"{output_filename}.wav"
            
            logger.info(f"🎤 Generating reference audio: '{text[:50]}...'")
            
            # Create temporary file for input text
            with tempfile.NamedTemporaryFile(
                mode='w', encoding='utf-8', suffix='.txt', delete=False
            ) as text_file:
                text_file.write(text)
                text_file_path = text_file.name
            
            try:
                # Piper uses length_scale (inverse of speed)
                length_scale = 1.0 / speed
                
                # Execute Piper CLI via Python module
                cmd = [
                    sys.executable,
                    '-m',
                    'piper',
                    '--model',
                    str(model_path),
                    '--config',
                    str(config_path),
                    '--input-file',
                    text_file_path,
                    '--output-file',
                    str(output_path),
                    '--length-scale',
                    str(length_scale),
                ]
                
                logger.debug(f"🚀 Executing: {' '.join(cmd)}")
                result = subprocess.run(
                    cmd,
                    capture_output=True,
                    text=True,
                    check=True,
                    timeout=30
                )
                
                if result.stdout:
                    logger.debug(f"Piper stdout: {result.stdout}")
                if result.stderr:
                    logger.debug(f"Piper stderr: {result.stderr}")
                
                if not output_path.exists():
                    raise RuntimeError(f"Audio file not generated: {output_path}")
                
                logger.info(f"✅ Reference audio generated: {output_path}")
                return str(output_path)
                
            finally:
                # Clean up temporary text file
                try:
                    os.unlink(text_file_path)
                except Exception:
                    pass
            
        except subprocess.CalledProcessError as exc:
            logger.error(f"❌ Piper CLI failed: {exc}")
            logger.error(f"stdout: {exc.stdout}")
            logger.error(f"stderr: {exc.stderr}")
            raise RuntimeError(f"Piper CLI failed: {exc.stderr}")
        except subprocess.TimeoutExpired:
            logger.error("❌ Piper TTS timed out")
            raise RuntimeError("Audio generation timed out")
        except Exception as e:
            logger.error(f"❌ Failed to generate reference audio: {str(e)}")
            raise
    
    
    def generate_lesson_references(self, phrases: dict) -> dict:
        """
        Generate reference audio for multiple lesson phrases
        
        Args:
            phrases: Dict mapping phrase_id to text
                    Example: {"greeting": "Hello everyone", "intro": "My name is..."}
        
        Returns:
            Dict mapping phrase_id to generated audio file path
        """
        results = {}
        
        for phrase_id, text in phrases.items():
            try:
                output_path = self.generate_reference_audio(text, output_filename=phrase_id)
                results[phrase_id] = output_path
                logger.info(f"Generated reference for '{phrase_id}': {output_path}")
            except Exception as e:
                logger.error(f"Failed to generate reference for '{phrase_id}': {str(e)}")
                results[phrase_id] = None
        
        return results
    
    def list_references(self) -> list:
        """
        List all generated reference audio files
        
        Returns:
            List of reference audio file paths
        """
        if not self.references_dir.exists():
            return []
        
        wav_files = list(self.references_dir.glob("*.wav"))
        return [str(f) for f in wav_files]
    
    def clear_references(self):
        """Delete all generated reference audio files"""
        if not self.references_dir.exists():
            return
        
        for wav_file in self.references_dir.glob("*.wav"):
            try:
                wav_file.unlink()
                logger.info(f"Deleted reference: {wav_file}")
            except Exception as e:
                logger.error(f"Failed to delete {wav_file}: {str(e)}")

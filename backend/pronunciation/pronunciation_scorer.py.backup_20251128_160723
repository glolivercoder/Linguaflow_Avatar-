"""
PronunciationScorer - Calculate pronunciation scores by comparing with reference
"""

import speech_recognition as sr
import numpy as np
import logging
from typing import Dict, Any, Optional
from difflib import SequenceMatcher

logger = logging.getLogger(__name__)


class PronunciationScorer:
    """Calculate pronunciation scores and provide feedback"""
    
    def __init__(self):
        """Initialize speech recognizer for transcription"""
        logger.info("Initializing PronunciationScorer")
        self.recognizer = sr.Recognizer()
    
    def _transcribe_audio(self, audio_path: str) -> str:
        """
        Transcribe audio using speech recognition
        
        Args:
            audio_path: Path to audio file
        
        Returns:
            Transcribed text
        """
        try:
            with sr.AudioFile(audio_path) as source:
                audio_data = self.recognizer.record(source)
                text = self.recognizer.recognize_google(audio_data)
                logger.info(f"Transcription: {text}")
                return text.lower().strip()
        except Exception as e:
            logger.error(f"Transcription failed: {str(e)}")
            return ""
    
    def _calculate_text_similarity(self, text1: str, text2: str) -> float:
        """
        Calculate similarity between two texts
        
        Args:
            text1: First text
            text2: Second text
        
        Returns:
            Similarity score (0-100)
        """
        normalized1 = text1.lower().strip()
        normalized2 = text2.lower().strip()
        
        similarity = SequenceMatcher(None, normalized1, normalized2).ratio()
        return similarity * 100
    
    def _score_pitch(self, user_metrics: Dict, reference_metrics: Optional[Dict]) -> float:
        """
        Score pitch/intonation
        
        Args:
            user_metrics: User's acoustic metrics
            reference_metrics: Reference metrics (optional)
        
        Returns:
            Pitch score (0-100)
        """
        if not reference_metrics:
            # Basic pitch quality check
            pitch_mean = user_metrics.get("pitch_mean", 0)
            pitch_range = user_metrics.get("pitch_range", 0)
            
            # Acceptable range for English: 80-250 Hz
            if 80 <= pitch_mean <= 250 and pitch_range > 5:
                return 85.0
            return 60.0
        
        # Compare with reference
        user_pitch = user_metrics.get("pitch_mean", 0)
        ref_pitch = reference_metrics.get("pitch_mean", 0)
        
        if ref_pitch == 0:
            return 70.0
        
        pitch_diff = abs(user_pitch - ref_pitch) / ref_pitch
        score = max(0, 100 - (pitch_diff * 100))
        
        return min(100, score)
    
    def _score_fluency(self, user_metrics: Dict, reference_metrics: Optional[Dict]) -> float:
        """
        Score fluency/rhythm
        
        Args:
            user_metrics: User's acoustic metrics
            reference_metrics: Reference metrics (optional)
        
        Returns:
            Fluency score (0-100)
        """
        jitter = user_metrics.get("jitter_local", 0)
        spectral_flux = user_metrics.get("spectral_flux", 0)
        
        # Lower jitter = better fluency
        jitter_score = max(0, 100 - (jitter * 1000))
        
        # Moderate spectral flux is good
        flux_score = 100 - min(100, abs(spectral_flux - 0.5) * 100)
        
        return (jitter_score * 0.6 + flux_score * 0.4)
    
    def _score_voice_quality(self, user_metrics: Dict, reference_metrics: Optional[Dict]) -> float:
        """
        Score voice quality/clarity
        
        Args:
            user_metrics: User's acoustic metrics
            reference_metrics: Reference metrics (optional)
        
        Returns:
            Quality score (0-100)
        """
        hnr = user_metrics.get("voice_quality", 0)
        shimmer = user_metrics.get("shimmer_local", 0)
        
        # HNR (Harmonics-to-Noise Ratio): higher is better
        hnr_score = min(100, (hnr + 10) * 5)
        
        # Shimmer: lower is better
        shimmer_score = max(0, 100 - (shimmer * 50))
        
        return (hnr_score * 0.7 + shimmer_score * 0.3)
    
    def _generate_detailed_feedback(
        self,
        overall_score: float,
        pitch_score: float,
        fluency_score: float,
        quality_score: float,
        text_accuracy: float
    ) -> str:
        """
        Generate detailed feedback based on scores
        
        Returns:
            Feedback string
        """
        feedback_parts = []
        
        if overall_score >= 85:
            feedback_parts.append("🎉 Excelente pronúncia! Continue assim.")
        elif overall_score >= 70:
            feedback_parts.append("✅ Boa pronúncia! Alguns ajustes podem melhorar ainda mais.")
        else:
            feedback_parts.append("📚 Continue praticando! Veja as sugestões abaixo.")
        
        if pitch_score < 70:
            feedback_parts.append("🎵 Trabalhe na entonação: tente imitar o padrão melódico da frase.")
        
        if fluency_score < 70:
            feedback_parts.append("⏱️ Melhore a fluência: fale de forma mais constante e natural.")
        
        if quality_score < 70:
            feedback_parts.append("🔊 Aprimore a clareza: articule melhor as palavras.")
        
        if text_accuracy < 80:
            feedback_parts.append("📝 Revise a pronúncia: algumas palavras não foram reconhecidas corretamente.")
        
        return " ".join(feedback_parts)
    
    def compare_with_reference(
        self,
        user_metrics: Dict,
        reference_metrics: Optional[Dict],
        expected_text: str,
        user_audio_path: str
    ) -> Dict[str, Any]:
        """
        Compare user pronunciation with reference and calculate scores
        
        Args:
            user_metrics: User's acoustic metrics
            reference_metrics: Reference metrics (optional)
            expected_text: Expected text transcript
            user_audio_path: Path to user's audio file
        
        Returns:
            Dictionary with scores and feedback
        """
        # Transcribe user audio
        transcription = self._transcribe_audio(user_audio_path)
        
        # Calculate text accuracy
        text_accuracy = self._calculate_text_similarity(transcription, expected_text)
        
        # Calculate component scores
        pitch_score = self._score_pitch(user_metrics, reference_metrics)
        fluency_score = self._score_fluency(user_metrics, reference_metrics)
        quality_score = self._score_voice_quality(user_metrics, reference_metrics)
        
        # Calculate overall score (weighted average)
        overall_score = (
            pitch_score * 0.30 +
            fluency_score * 0.25 +
            quality_score * 0.20 +
            text_accuracy * 0.25
        )
        
        # Generate feedback
        detailed_feedback = self._generate_detailed_feedback(
            overall_score, pitch_score, fluency_score, quality_score, text_accuracy
        )
        
        return {
            "overall_score": round(overall_score, 2),
            "pitch_score": round(pitch_score, 2),
            "fluency_score": round(fluency_score, 2),
            "quality_score": round(quality_score, 2),
            "text_accuracy": round(text_accuracy, 2),
            "transcription": transcription,
            "detailed_feedback": detailed_feedback,
            "user_metrics": user_metrics,
            "reference_metrics": reference_metrics or {}
        }

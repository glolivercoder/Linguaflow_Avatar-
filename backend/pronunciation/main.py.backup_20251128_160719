"""
FastAPI Backend for Pronunciation Analysis with openSMILE
Endpoint: POST /analyze-pronunciation
"""

import logging
import os
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from pronunciation_analyzer import PronunciationAnalyzer
from pronunciation_scorer import PronunciationScorer
from reference_audio_generator import ReferenceAudioGenerator
import asyncio
from collections.abc import AsyncGenerator

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

DEFAULT_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:3003",
]


def get_allowed_origins() -> list[str]:
    env_origins = os.getenv("ALLOWED_ORIGINS", "").strip()

    if env_origins:
        origins = [origin.strip() for origin in env_origins.split(",") if origin.strip()]
        if origins:
            logger.info("Using CORS origins from ALLOWED_ORIGINS: %s", origins)
            return origins

    logger.info("Using default CORS origins: %s", DEFAULT_ALLOWED_ORIGINS)
    return DEFAULT_ALLOWED_ORIGINS

app = FastAPI(title="LinguaFlow Pronunciation API", version="1.0.0")

# CORS configuration for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=get_allowed_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize analyzers
logger.info("Inicializando PronunciationAnalyzer...")
pronunciation_analyzer = PronunciationAnalyzer()
logger.info("PronunciationAnalyzer pronto.")

logger.info("Inicializando PronunciationScorer...")
pronunciation_scorer = PronunciationScorer()
logger.info("PronunciationScorer pronto.")

logger.info("Inicializando ReferenceAudioGenerator...")
reference_generator = ReferenceAudioGenerator()
logger.info("ReferenceAudioGenerator pronto.")

# Serve generated reference audio files so the frontend can fetch them
references_dir = Path(reference_generator.references_dir)
app.mount(
    "/references",
    StaticFiles(directory=str(references_dir)),
    name="references",
)


class PronunciationResponse(BaseModel):
    overall_score: float
    pitch_score: float
    fluency_score: float
    quality_score: float
    text_accuracy: float
    transcription: str
    detailed_feedback: str
    user_metrics: dict
    reference_metrics: dict


class ReferenceGenerationRequest(BaseModel):
    text: str
    voice_model: str | None = None


class ReferenceGenerationResponse(BaseModel):
    status: str
    audio_path: str
    audio_url: str | None
    text: str
    voice_model: str


class VoiceModelInfo(BaseModel):
    key: str
    language: str
    quality: str | None = None
    file_path: str


@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "status": "online",
        "service": "LinguaFlow Pronunciation API",
        "version": "1.0.0"
    }


@app.post("/analyze-pronunciation", response_model=PronunciationResponse)
async def analyze_pronunciation(
    audio: UploadFile = File(...),
    expected_text: str = Form(...),
    reference_audio_path: Optional[str] = Form(None)
):
    """
    Analyze user's pronunciation and compare with reference
    
    Args:
        audio: User's audio file (WAV, 16kHz, mono recommended)
        expected_text: Expected text transcript
        reference_audio_path: Optional path to native speaker reference audio
    
    Returns:
        PronunciationResponse with scores, transcription, and feedback
    """
    
    try:
        # Save uploaded audio temporarily
        import tempfile
        import os
        
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as temp_audio:
            contents = await audio.read()
            temp_audio.write(contents)
            user_audio_path = temp_audio.name
        
        logger.info(f"Analyzing pronunciation for text: {expected_text}")
        
        # Extract features from user audio
        user_metrics = pronunciation_analyzer.extract_features(user_audio_path)
        
        # Extract features from reference audio if provided
        reference_metrics = None
        if reference_audio_path and os.path.exists(reference_audio_path):
            reference_metrics = pronunciation_analyzer.extract_features(reference_audio_path)
        
        # Calculate scores
        result = pronunciation_scorer.compare_with_reference(
            user_metrics=user_metrics,
            reference_metrics=reference_metrics,
            expected_text=expected_text,
            user_audio_path=user_audio_path
        )
        
        # Clean up temporary file
        os.unlink(user_audio_path)
        
        logger.info(f"Analysis complete. Overall score: {result['overall_score']:.2f}")
        
        return JSONResponse(content=result)
    
    except Exception as e:
        logger.error(f"Error during pronunciation analysis: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


@app.get("/health")
async def health_check():
    """Detailed health check"""
    return {
        "status": "healthy",
        "opensmile": "configured",
        "models": "loaded",
        "tts": "piper-tts available"
    }


@app.post("/generate-reference")
async def generate_reference(text: str = Form(...), voice_model: str | None = Form(None)):
    """
    Generate reference audio using Piper TTS
    """
    try:
        logger.info(f"Generating reference audio for text: {text} voice_model={voice_model or 'default'}")
        
        # Resolve voice model key to full path if needed
        resolved_model_path = None
        if voice_model:
            # If voice_model is just a key (e.g., "en_US-lessac-medium"), resolve to full path
            if not voice_model.endswith('.onnx'):
                available_models = reference_generator.list_available_models()
                for model_info in available_models:
                    if model_info['key'] == voice_model:
                        resolved_model_path = model_info['file_path']
                        logger.info(f"Resolved model key '{voice_model}' to path '{resolved_model_path}'")
                        break
                
                if not resolved_model_path:
                    raise ValueError(f"Voice model key '{voice_model}' not found in available models")
            else:
                resolved_model_path = voice_model
        
        audio_path = reference_generator.generate_reference_audio(text, voice_model_path=resolved_model_path)
        relative_path = os.path.relpath(audio_path, reference_generator.references_dir.parent)
        audio_url = f"/references/{Path(audio_path).name}"

        # Ensure voice model path is JSON serializable (string)
        voice_model_value = (
            str(resolved_model_path)
            if resolved_model_path
            else str(reference_generator.voice_model_path)
        )

        return JSONResponse(content={
            "status": "success",
            "audio_path": relative_path.replace(os.path.sep, '/'),
            "audio_url": audio_url,
            "text": text,
            "voice_model": voice_model_value,
        })

    except Exception as e:
        logger.error(f"Reference generation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Generation failed: {str(e)}")


@app.get("/voice-models", response_model=list[VoiceModelInfo])
async def list_voice_models():
    """Return available Piper voice models discovered on the server"""
    models = []
    for model_info in reference_generator.list_available_models():
        models.append(model_info)
    return models


@app.post("/generate-lesson-references")
async def generate_lesson_references(phrases: dict):
    """
    Generate multiple reference audios for a lesson
    
    Args:
        phrases: Dict mapping phrase_id to text
    
    Returns:
        Dict with generated audio paths
    """
    try:
        logger.info(f"Generating {len(phrases)} lesson references")
        
        results = reference_generator.generate_lesson_references(phrases)
        
        return JSONResponse(content={
            "status": "success",
            "references": results
        })
    
    except Exception as e:
        logger.error(f"Lesson reference generation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Generation failed: {str(e)}")


@app.get("/list-references")
async def list_references():
    """List all available reference audio files"""
    references = reference_generator.list_references()
    return JSONResponse(content={
        "status": "success",
        "count": len(references),
        "references": references
    })


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

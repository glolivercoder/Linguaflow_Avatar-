"""
FastAPI Backend SIMPLIFICADO para Pronunciation Analysis
Versão sem openSMILE para facilitar setup no Windows
"""

import logging
import os
import tempfile
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from gtts import gTTS
import speech_recognition as sr
from difflib import SequenceMatcher

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


app = FastAPI(title="LinguaFlow Pronunciation API (Simple)", version="1.0.0")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=get_allowed_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create references directory
REFERENCES_DIR = Path("references")
REFERENCES_DIR.mkdir(exist_ok=True)

# Mount references directory as static files
app.mount("/references", StaticFiles(directory="references"), name="references")


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


def transcribe_audio(audio_path: str) -> str:
    """Transcribe audio using speech recognition"""
    try:
        recognizer = sr.Recognizer()
        with sr.AudioFile(audio_path) as source:
            audio_data = recognizer.record(source)
            text = recognizer.recognize_google(audio_data)
            logger.info(f"Transcription: {text}")
            return text.lower().strip()
    except Exception as e:
        logger.error(f"Transcription failed: {str(e)}")
        return ""


def calculate_text_similarity(text1: str, text2: str) -> float:
    """Calculate similarity between two texts"""
    normalized1 = text1.lower().strip()
    normalized2 = text2.lower().strip()
    similarity = SequenceMatcher(None, normalized1, normalized2).ratio()
    return similarity * 100


def generate_feedback(text_accuracy: float) -> str:
    """Generate feedback based on text accuracy"""
    if text_accuracy >= 90:
        return "🎉 Excelente pronúncia! Você foi compreendido perfeitamente."
    elif text_accuracy >= 75:
        return "✅ Boa pronúncia! Algumas pequenas diferenças, mas muito bom."
    elif text_accuracy >= 60:
        return "📚 Continue praticando! Você está no caminho certo."
    else:
        return "💪 Tente novamente! Pronuncie mais claramente e tente imitar o áudio de referência."


@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "status": "online",
        "service": "LinguaFlow Pronunciation API (Simple)",
        "version": "1.0.0"
    }


@app.post("/analyze-pronunciation", response_model=PronunciationResponse)
async def analyze_pronunciation(
    audio: UploadFile = File(...),
    expected_text: str = Form(...),
    reference_audio_path: Optional[str] = Form(None)
):
    """
    Analyze pronunciation (simplified version)
    """
    try:
        # Save uploaded audio
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as temp_audio:
            contents = await audio.read()
            temp_audio.write(contents)
            user_audio_path = temp_audio.name
        
        logger.info(f"Analyzing pronunciation for: {expected_text}")
        
        # Transcribe user audio
        transcription = transcribe_audio(user_audio_path)
        
        # Calculate text accuracy
        text_accuracy = calculate_text_similarity(transcription, expected_text)
        
        # Simplified scores (sem openSMILE)
        # Baseado principalmente na precisão do texto
        overall_score = text_accuracy
        pitch_score = min(100, text_accuracy + 10)  # Assume boa entonação se texto correto
        fluency_score = min(100, text_accuracy + 5)
        quality_score = min(100, text_accuracy + 8)
        
        # Generate feedback
        feedback = generate_feedback(text_accuracy)
        
        # Clean up
        os.unlink(user_audio_path)
        
        result = {
            "overall_score": round(overall_score, 2),
            "pitch_score": round(pitch_score, 2),
            "fluency_score": round(fluency_score, 2),
            "quality_score": round(quality_score, 2),
            "text_accuracy": round(text_accuracy, 2),
            "transcription": transcription,
            "detailed_feedback": feedback,
            "user_metrics": {"text_match": text_accuracy},
            "reference_metrics": {}
        }
        
        logger.info(f"Analysis complete. Overall score: {result['overall_score']:.2f}")
        return JSONResponse(content=result)
    
    except Exception as e:
        logger.error(f"Error during analysis: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


@app.post("/generate-reference")
async def generate_reference(text: str = Form(...)):
    """Generate reference audio using gTTS"""
    try:
        logger.info(f"Generating reference audio for: {text}")
        
        # Generate filename
        safe_text = "".join(c if c.isalnum() or c.isspace() else "_" for c in text[:50])
        safe_text = safe_text.strip().replace(" ", "_")
        filename = f"ref_{safe_text}.mp3"
        output_path = REFERENCES_DIR / filename
        
        # Generate audio with gTTS
        tts = gTTS(text=text, lang='en', slow=False)
        tts.save(str(output_path))
        
        logger.info(f"Reference audio generated: {output_path}")
        
        # Return relative path with forward slashes for URLs
        relative_path = f"references/{filename}"
        
        return JSONResponse(content={
            "status": "success",
            "audio_path": relative_path,
            "text": text
        })
    
    except Exception as e:
        logger.error(f"Reference generation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Generation failed: {str(e)}")


@app.get("/references/{filename}")
async def serve_reference(filename: str):
    """Serve reference audio file"""
    file_path = REFERENCES_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(file_path)


@app.get("/list-references")
async def list_references():
    """List all reference audio files"""
    references = list(REFERENCES_DIR.glob("*.mp3"))
    return JSONResponse(content={
        "status": "success",
        "count": len(references),
        "references": [str(r) for r in references]
    })


@app.get("/health")
async def health_check():
    """Detailed health check"""
    return {
        "status": "healthy",
        "tts": "gTTS (Google)",
        "speech_recognition": "Google Speech API",
        "note": "Versão simplificada sem openSMILE"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)

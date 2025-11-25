from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from faster_whisper import WhisperModel
import httpx
import os
import base64
import tempfile
import subprocess
from dotenv import load_dotenv
from pathlib import Path
import logging

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Whisper STT Service")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration from environment
WHISPER_MODEL = os.getenv("WHISPER_MODEL", "base")
WHISPER_DEVICE = os.getenv("WHISPER_DEVICE", "cpu")
WHISPER_COMPUTE_TYPE = os.getenv("WHISPER_COMPUTE_TYPE", "int8")
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
PIPER_VOICE_MODEL = os.getenv("PIPER_VOICE_MODEL", "en_US-lessac-medium")

# Global Whisper model
whisper_model = None

@app.on_event("startup")
async def startup_event():
    """Initialize Whisper model on startup"""
    global whisper_model
    try:
        # Define model cache directory
        model_cache_dir = os.path.join(os.path.dirname(__file__), "models")
        os.makedirs(model_cache_dir, exist_ok=True)
        
        logger.info(f"Loading Whisper model: {WHISPER_MODEL} on {WHISPER_DEVICE} with {WHISPER_COMPUTE_TYPE}")
        whisper_model = WhisperModel(
            WHISPER_MODEL,
            device=WHISPER_DEVICE,
            compute_type=WHISPER_COMPUTE_TYPE,
            download_root=model_cache_dir
        )
        logger.info("Whisper model loaded successfully")
    except Exception as e:
        logger.error(f"Failed to load Whisper model: {e}")
        raise

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "model": WHISPER_MODEL,
        "device": WHISPER_DEVICE,
        "compute_type": WHISPER_COMPUTE_TYPE,
        "model_loaded": whisper_model is not None
    }

from pydantic import BaseModel

class AudioRequest(BaseModel):
    audio_base64: str
    language: str = "auto"

@app.post("/whisper/chat/audio")
async def chat_with_audio(request: AudioRequest):
    """
    Process audio input with Whisper STT, LLM, and TTS
    
    Args:
        request: JSON containing audio_base64 and language
    
    Returns:
        JSON with transcription, detected language, LLM response, and TTS audio
    """
    if not whisper_model:
        raise HTTPException(status_code=503, detail="Whisper model not loaded")
    
    try:
        # Decode base64 audio to temporary file
        try:
            # Remove header if present (e.g., "data:audio/wav;base64,")
            if "," in request.audio_base64:
                audio_data = base64.b64decode(request.audio_base64.split(",")[1])
            else:
                audio_data = base64.b64decode(request.audio_base64)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid base64 audio: {str(e)}")

        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as temp_audio:
            temp_audio.write(audio_data)
            temp_audio_path = temp_audio.name
        
        logger.info(f"Processing audio with language setting: {request.language}")
        
        # Transcribe with Whisper
        # If language is 'auto', pass None to enable auto-detection
        whisper_language = None if request.language == "auto" else request.language
        
        segments, info = whisper_model.transcribe(
            temp_audio_path,
            language=whisper_language,
            beam_size=5
        )
        
        # Collect transcription segments
        transcription = " ".join([segment.text for segment in segments])
        detected_language = info.language
        
        logger.info(f"Transcription: {transcription}")
        logger.info(f"Detected language: {detected_language}")
        
        # Clean up temp audio file
        os.unlink(temp_audio_path)
        
        if not transcription.strip():
            return {
                "transcription": "",
                "language_detected": detected_language,
                "llm_response": "I didn't catch that. Could you please speak again?",
                "audio_base64": ""
            }
        
        # Call OpenRouter LLM
        llm_response = await call_openrouter_llm(transcription)
        
        # Generate TTS audio with Piper
        audio_base64 = await generate_piper_tts(llm_response)
        
        return {
            "transcription": transcription,
            "language_detected": detected_language,
            "llm_response": llm_response,
            "audio_base64": audio_base64
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing audio: {e}")
        raise HTTPException(status_code=500, detail=str(e))

async def call_openrouter_llm(user_message: str) -> str:
    """Call OpenRouter API for LLM response"""
    if not OPENROUTER_API_KEY:
        logger.warning("OpenRouter API key not configured")
        return "LLM not configured. Please set OPENROUTER_API_KEY."
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "meta-llama/llama-3.1-8b-instruct:free",
                    "messages": [
                        {
                            "role": "system",
                            "content": "You are a helpful assistant. Keep responses concise and natural."
                        },
                        {
                            "role": "user",
                            "content": user_message
                        }
                    ]
                },
                timeout=30.0
            )
            
            if response.status_code == 200:
                data = response.json()
                return data["choices"][0]["message"]["content"]
            else:
                logger.error(f"OpenRouter API error: {response.status_code} - {response.text}")
                return "Sorry, I'm having trouble connecting to the AI service."
                
    except Exception as e:
        logger.error(f"Error calling OpenRouter: {e}")
        return "Sorry, I encountered an error processing your request."

async def generate_piper_tts(text: str) -> str:
    """Generate TTS audio using Piper and return base64 encoded WAV"""
    try:
        # Path to Piper executable
        piper_path = Path(__file__).parent.parent / "pronunciation" / "piper" / "piper.exe"
        
        if not piper_path.exists():
            logger.error(f"Piper executable not found at {piper_path}")
            return ""
        
        # Create temporary output file
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as temp_output:
            output_path = temp_output.name
        
        # Run Piper TTS
        process = subprocess.run(
            [
                str(piper_path),
                "--model", PIPER_VOICE_MODEL,
                "--output_file", output_path
            ],
            input=text.encode('utf-8'),
            capture_output=True,
            timeout=10
        )
        
        if process.returncode != 0:
            logger.error(f"Piper TTS error: {process.stderr.decode()}")
            return ""
        
        # Read and encode audio file
        with open(output_path, 'rb') as f:
            audio_data = f.read()
            audio_base64 = base64.b64encode(audio_data).decode('utf-8')
        
        # Clean up
        os.unlink(output_path)
        
        return audio_base64
        
    except Exception as e:
        logger.error(f"Error generating TTS: {e}")
        return ""

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("WHISPER_SERVICE_PORT", "8003"))
    uvicorn.run(app, host="0.0.0.0", port=port)

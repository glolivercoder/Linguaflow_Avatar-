"""
FastAPI service for Wav2Lip lip-sync generation.
Port: 8301
"""
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pathlib import Path
import base64
import tempfile
import subprocess
import os
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Wav2Lip Service", version="1.0.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Paths
SERVICE_DIR = Path(__file__).parent
CHECKPOINTS_DIR = SERVICE_DIR / "checkpoints"
TEMP_DIR = SERVICE_DIR / "temp"
TEMP_DIR.mkdir(exist_ok=True)

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    models_exist = {
        "wav2lip.pth": (CHECKPOINTS_DIR / "wav2lip.pth").exists(),
        "wav2lip_gan.pth": (CHECKPOINTS_DIR / "wav2lip_gan.pth").exists(),
        "s3fd.pth": (SERVICE_DIR / "face_detection" / "detection" / "sfd" / "s3fd.pth").exists(),
    }
    
    # Service is ready if we have at least one Wav2Lip model + face detector
    service_ready = (models_exist["wav2lip_gan.pth"] or models_exist["wav2lip.pth"]) and models_exist["s3fd.pth"]
    
    return {
        "status": "healthy",
        "models": models_exist,
        "all_models_ready": all(models_exist.values()),
        "service_ready": service_ready
    }

@app.post("/generate")
async def generate_lipsync(
    avatar_image: str = Form(...),  # base64
    audio: str = Form(...),          # base64
    quality: str = Form("base")      # "base" or "gan"
):
    """
    Generate lip-synced video from avatar image and audio.
    
    Args:
        avatar_image: Base64 encoded image (JPG/PNG)
        audio: Base64 encoded audio (WAV/MP3)
        quality: "base" (faster) or "gan" (better quality)
    
    Returns:
        Base64 encoded MP4 video
    """
    try:
        logger.info(f"Generating lip-sync video (quality={quality})")
        
        # Decode inputs
        image_data = base64.b64decode(avatar_image)
        audio_data = base64.b64decode(audio)
        
        # Create temp files
        with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False, dir=TEMP_DIR) as img_file:
            img_file.write(image_data)
            img_path = img_file.name
        
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False, dir=TEMP_DIR) as aud_file:
            aud_file.write(audio_data)
            aud_path = aud_file.name
        
        output_path = TEMP_DIR / f"result_{Path(img_path).stem}.mp4"
        
        # Select checkpoint - prefer GAN if available, fallback to base
        if quality == "gan" or not (CHECKPOINTS_DIR / "wav2lip.pth").exists():
            checkpoint = "wav2lip_gan.pth"
        else:
            checkpoint = "wav2lip.pth"
        
        checkpoint_path = CHECKPOINTS_DIR / checkpoint
        
        if not checkpoint_path.exists():
            raise HTTPException(status_code=500, detail=f"Model {checkpoint} not found")
        
        # Run Wav2Lip inference
        # Note: This assumes inference.py from Wav2Lip repo is in the same directory
        cmd = [
            "python", "inference.py",
            "--checkpoint_path", str(checkpoint_path),
            "--face", img_path,
            "--audio", aud_path,
            "--outfile", str(output_path),
            "--resize_factor", "1",  # CPU optimization
            "--fps", "25"  # Lower FPS for CPU
        ]
        
        logger.info(f"Running: {' '.join(cmd)}")
        result = subprocess.run(
            cmd,
            cwd=SERVICE_DIR,
            capture_output=True,
            text=True,
            timeout=60  # 60s timeout
        )
        
        if result.returncode != 0:
            logger.error(f"Wav2Lip failed: {result.stderr}")
            raise HTTPException(status_code=500, detail=f"Wav2Lip inference failed: {result.stderr}")
        
        # Read output video
        if not output_path.exists():
            raise HTTPException(status_code=500, detail="Output video not generated")
        
        with open(output_path, "rb") as f:
            video_data = f.read()
        
        video_base64 = base64.b64encode(video_data).decode('utf-8')
        
        # Cleanup
        try:
            os.unlink(img_path)
            os.unlink(aud_path)
            os.unlink(output_path)
        except Exception as e:
            logger.warning(f"Cleanup failed: {e}")
        
        logger.info("Lip-sync video generated successfully")
        return {
            "video": video_base64,
            "duration_ms": len(video_data) // 1000  # Rough estimate
        }
    
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=504, detail="Processing timeout (>60s)")
    except Exception as e:
        logger.error(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8301)

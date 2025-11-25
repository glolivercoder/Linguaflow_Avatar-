import sys
import os
import time
import base64
import numpy as np
import cv2
import openvino.runtime as ov
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn
import io
import tempfile
from pathlib import Path

# Import audio processing
import audio

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load OpenVINO Model
MODEL_PATH = "wav2lip_openvino.xml"
core = ov.Core()
compiled_model = None
input_layer_audio = None
input_layer_face = None
output_layer = None

def load_model():
    global compiled_model, input_layer_audio, input_layer_face, output_layer
    if not os.path.exists(MODEL_PATH):
        print(f"Model not found: {MODEL_PATH}")
        return
    
    print("Loading OpenVINO model...")
    model = core.read_model(model=MODEL_PATH)
    # Compile for CPU (or GPU if available/configured, but user has CPU)
    compiled_model = core.compile_model(model=model, device_name="CPU")
    
    # Get input/output layers
    # Note: Names might vary depending on export. We use index or name if known.
    # In export script we named them: 'audio_sequences', 'face_sequences', 'outputs'
    try:
        input_layer_audio = compiled_model.input("audio_sequences")
        input_layer_face = compiled_model.input("face_sequences")
        output_layer = compiled_model.output("outputs")
    except Exception as e:
        print(f"Error getting layers by name: {e}. Trying by index.")
        input_layer_audio = compiled_model.input(0)
        input_layer_face = compiled_model.input(1)
        output_layer = compiled_model.output(0)
        
    print("Model loaded successfully.")

# Load model on startup
load_model()

@app.get("/health")
async def health():
    return {
        "status": "ok",
        "service_ready": compiled_model is not None,
        "model_loaded": compiled_model is not None
    }

@app.post("/wav2lip/generate")
async def generate(
    avatar_image: str = Form(...),
    audio_param: str = Form(..., alias='audio'),
    quality: str = Form("base")
):
    if not compiled_model:
        raise HTTPException(status_code=500, detail="Model not loaded")

    temp_audio_path = None
    temp_video_path = None

    try:
        # 1. Read Image (Base64)
        # Remove header if present
        if "base64," in avatar_image:
            avatar_image = avatar_image.split("base64,")[1]
            
        image_bytes = base64.b64decode(avatar_image)
        nparr = np.frombuffer(image_bytes, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if frame is None:
            raise HTTPException(status_code=400, detail="Invalid image")

        # Resize to 96x96 for inference
        face_input = cv2.resize(frame, (96, 96))
        
        # Prepare face input (1, 6, 96, 96)
        # Mask lower half
        mask = np.zeros_like(face_input)
        mask[48:, :, :] = 1 
        masked_face = face_input * (1 - mask)
        
        # Concatenate: (Channel, H, W)
        ref_img = face_input.transpose(2, 0, 1)
        masked_img = masked_face.transpose(2, 0, 1)
        
        # Concatenate along channel dimension: (6, 96, 96)
        face_seq = np.concatenate((masked_img, ref_img), axis=0)
        face_seq = face_seq[np.newaxis, :, :, :] # (1, 6, 96, 96)
        face_seq = face_seq.astype(np.float32) / 255.0
        
        # 2. Process Audio (Base64)
        audio_data = audio_param
        if "base64," in audio_data:
            audio_data = audio_data.split("base64,")[1]
            
        audio_bytes = base64.b64decode(audio_data)
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as temp_audio:
            temp_audio.write(audio_bytes)
            temp_audio_path = temp_audio.name
            
        wav = audio.load_wav(temp_audio_path, 16000)
        mel = audio.melspectrogram(wav)
        
        if np.isnan(mel.reshape(-1)).sum() > 0:
            raise HTTPException(status_code=400, detail="Mel spectrogram contains NaN")

        # Chunking logic
        mel_chunks = []
        fps = 25
        mel_idx_multiplier = 80. / fps
        i = 0
        while 1:
            start_idx = int(i * mel_idx_multiplier)
            if start_idx + 16 > mel.shape[1]:
                break
            mel_chunks.append(mel[:, start_idx : start_idx + 16])
            i += 1

        print(f"Generated {len(mel_chunks)} frames.")
        
        # 3. Inference Loop
        result_frames = []
        
        # Batch processing? OpenVINO supports batching but our model is exported with B=1.
        # We loop.
        
        for m in mel_chunks:
            # Prepare audio input: (1, 1, 80, 16)
            m = m[np.newaxis, np.newaxis, :, :]
            
            # Run Inference
            # Inputs: [audio, face]
            # Note: face_seq is constant for all frames (static image)
            
            # OpenVINO inference
            request = compiled_model.create_infer_request()
            request.infer({
                input_layer_audio: m,
                input_layer_face: face_seq
            })
            res = request.get_output_tensor(0).data
            
            # res shape: (1, 3, 96, 96)
            pred = res[0].transpose(1, 2, 0) * 255.0
            pred = pred.astype(np.uint8)
            result_frames.append(pred)
            
        # 4. Generate Video
        if not result_frames:
             raise HTTPException(status_code=400, detail="No frames generated")

        with tempfile.NamedTemporaryFile(suffix=".avi", delete=False) as temp_video:
            temp_video_path = temp_video.name
            
        # OpenCV writes AVI, we'll convert to MP4 with ffmpeg later
        out = cv2.VideoWriter(
            temp_video_path,
            cv2.VideoWriter_fourcc(*'DIVX'), 
            fps, 
            (96, 96)
        )
        
        for f in result_frames:
            out.write(f)
        out.release()
        
        # Combine with audio using ffmpeg (optional but good for sync)
        # But we return base64 video.
        # The browser plays video. If we just return video frames, audio is separate?
        # The current implementation returns video WITHOUT audio?
        # Let's check wav2lipService.ts.
        # It sets `videoRef.current.src = videoUrl`.
        # If the video has no audio, it won't play audio.
        # But the audio is played by the browser separately?
        # No, usually we want the video to have audio.
        # The existing `wav2lip_service/main.py` uses ffmpeg to merge audio.
        
        # We should merge audio.
        # We need ffmpeg.
        final_video_path = temp_video_path.replace(".avi", "_final.mp4")
        
        # Convert to MP4 with H.264 (browser-compatible) and merge audio
        subprocess_cmd = [
            "ffmpeg", "-y",
            "-i", temp_video_path,
            "-i", temp_audio_path,
            "-c:v", "libx264",  # H.264 codec for browser compatibility
            "-preset", "ultrafast",  # Fast encoding
            "-pix_fmt", "yuv420p",  # Compatible pixel format
            "-c:a", "aac",
            "-b:a", "128k",  # Audio bitrate
            "-strict", "experimental",
            final_video_path
        ]
        import subprocess
        subprocess.check_call(subprocess_cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        
        # Read final video
        with open(final_video_path, "rb") as f:
            video_base64 = base64.b64encode(f.read()).decode("utf-8")
            
        # Cleanup
        if os.path.exists(final_video_path):
            os.remove(final_video_path)
            
        return {
            "video": video_base64,
            "duration_ms": int((len(result_frames) / fps) * 1000)
        }

    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
        
    finally:
        if temp_audio_path and os.path.exists(temp_audio_path):
            os.remove(temp_audio_path)
        if temp_video_path and os.path.exists(temp_video_path):
            os.remove(temp_video_path)

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8301) # Port 8301 for new service

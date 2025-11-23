import sys
import os
import wave
import io
from fastapi.testclient import TestClient

# Add backend to path
sys.path.append(os.getcwd())

# Set VOSK_MODEL_PATH to absolute path
model_path = os.path.join(os.getcwd(), "vosk_service", "model")
os.environ["VOSK_MODEL_PATH"] = model_path
print(f"Setting VOSK_MODEL_PATH to: {model_path}")

# Set PIPER_VOICE_MODEL to absolute path
piper_path = os.path.join(os.getcwd(), "pronunciation", "models", "en_US-lessac-medium.onnx")
os.environ["PIPER_VOICE_MODEL"] = piper_path
print(f"Setting PIPER_VOICE_MODEL to: {piper_path}")

try:
    from vosk_service.main import app
    client = TestClient(app)
    
    # Create a dummy WAV file (1 second of silence)
    audio_bytes = io.BytesIO()
    with wave.open(audio_bytes, 'wb') as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(16000)
        wav_file.writeframes(b'\x00' * 32000)
    
    audio_bytes.seek(0)
    
    import base64
    
    # Read the wav file and encode to base64
    audio_bytes.seek(0)
    audio_b64 = base64.b64encode(audio_bytes.read()).decode('utf-8')
    
    print("Sending JSON request to /chat/audio...")
    payload = {
        "model": "google/gemma-2-9b-it:free",
        "audio_base64": audio_b64,
        "system_prompt": "You are a helpful assistant.",
        "language": "pt-BR"
    }
    
    # Use context manager to trigger startup events
    with TestClient(app) as client:
        response = client.post("/chat/audio", json=payload)
        
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
    
except Exception as e:
    print(f"Error testing endpoint: {e}")
    import traceback
    traceback.print_exc()

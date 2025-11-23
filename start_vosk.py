"""
Script auxiliar para iniciar o Vosk Service com as variáveis de ambiente corretas.
"""
import os
import sys
from pathlib import Path

# Get the script directory
script_dir = Path(__file__).resolve().parent

# Set environment variables
os.environ["VOSK_MODEL_PATH"] = str(script_dir / "backend" / "vosk_service" / "model")
os.environ["PIPER_VOICE_MODEL"] = str(script_dir / "backend" / "pronunciation" / "models" / "en_US-lessac-medium.onnx")

print(f"[INFO] VOSK_MODEL_PATH={os.environ['VOSK_MODEL_PATH']}")
print(f"[INFO] PIPER_VOICE_MODEL={os.environ['PIPER_VOICE_MODEL']}")

# Change to backend directory
os.chdir(script_dir / "backend")

# Add backend to path
sys.path.insert(0, str(script_dir / "backend"))

# Import and run the Vosk service
print("[INFO] Starting Vosk Service...")
from vosk_service.main import app
import uvicorn

uvicorn.run(app, host="0.0.0.0", port=8200)

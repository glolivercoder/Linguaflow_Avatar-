"""
Vosk Service Starter with .env Loading
Loads environment variables from app/.env file
Then starts the Vosk FastAPI service
"""
import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Get the directory where this script is located (app directory)
script_dir = Path(__file__).parent

# Add vosk_service directory to Python path so we can import main
vosk_service_dir = script_dir / "backend" / "vosk_service"
sys.path.insert(0, str(vosk_service_dir))

# Load .env from the app directory (same directory as this script)
dotenv_path = script_dir / '.env'

print(f"[Vosk] Looking for .env at: {dotenv_path}")

if dotenv_path.exists():
    load_dotenv(dotenv_path, override=True)
    print(f"[Vosk] ✓ Loaded .env from: {dotenv_path}")
    
    # Verify OpenRouter API key was loaded
    api_key = os.getenv("OPENROUTER_API_KEY")
    if api_key:
        print(f"[Vosk] ✓ OpenRouter API Key loaded: {api_key[:15]}...")
    else:
        print("[Vosk] ⚠ OPENROUTER_API_KEY not found in .env")
        
    # Show other relevant env vars
    vosk_model = os.getenv("VOSK_MODEL_PATH")
    if vosk_model:
        print(f"[Vosk] ✓ VOSK_MODEL_PATH: {vosk_model}")
else:
    print(f"[Vosk] ⚠ .env file not found at: {dotenv_path}")
    print("[Vosk] Service will start but may not have all configuration")

# Set default paths if not in env
if not os.getenv("VOSK_MODEL_PATH"):
    default_model = script_dir / "model"
    os.environ["VOSK_MODEL_PATH"] = str(default_model)
    print(f"[Vosk] Using default model path: {default_model}")

if not os.getenv("PIPER_VOICE_MODEL"):
    default_piper = script_dir / "pronunciation" / "models" / "en_US-lessac-medium.onnx"
    os.environ["PIPER_VOICE_MODEL"] = str(default_piper)
    print(f"[Vosk] Using default Piper model: {default_piper}")

print("[Vosk] Starting Vosk Service...")
print("-" * 50)

# Import and run the main service
from main import app
import uvicorn

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8200)

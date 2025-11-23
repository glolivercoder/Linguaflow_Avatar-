import os
import sys
import traceback

print("Python executable:", sys.executable)
print("Current working directory:", os.getcwd())

# Add vosk_service to path if needed or just try import
try:
    import vosk
    print("Vosk module imported successfully.")
except ImportError:
    print("ERROR: Could not import vosk module. Checking venv...")
    # Try to activate venv logic or just warn
    pass

MODEL_PATH = os.path.join("vosk_service", "model")
if not os.path.exists(MODEL_PATH):
    print(f"ERROR: Model path '{MODEL_PATH}' does not exist.")
    sys.exit(1)

try:
    print(f"Attempting to load model from '{MODEL_PATH}'...")
    vosk.SetLogLevel(0)
    model = vosk.Model(MODEL_PATH)
    print("SUCCESS: Vosk model loaded successfully!")
except Exception as e:
    print("ERROR: Failed to load Vosk model.")
    traceback.print_exc()

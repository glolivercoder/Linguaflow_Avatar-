import os
from dotenv import load_dotenv

load_dotenv()

print("Checking environment variables...")

keys_to_check = ["OPENROUTER_API_KEY", "VOSK_MODEL_PATH"]

for key in keys_to_check:
    value = os.getenv(key)
    if key == "VOSK_MODEL_PATH":
        print(f"{key}: {value}")
    elif value:
        masked = value[:4] + "..." + value[-4:] if len(value) > 8 else "****"
        print(f"{key}: Found ({masked})")
    else:
        print(f"{key}: MISSING")

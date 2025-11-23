import requests
import json
import base64

# Create a minimal valid WAV file (silence)
def create_minimal_wav():
    import struct
    sample_rate = 16000
    duration = 0.1  # 100ms
    num_samples = int(sample_rate * duration)
    
    # WAV header
    wav = b'RIFF'
    wav += struct.pack('<I', 36 + num_samples * 2)
    wav += b'WAVE'
    wav += b'fmt '
    wav += struct.pack('<I', 16)  # fmt chunk size
    wav += struct.pack('<H', 1)   # PCM
    wav += struct.pack('<H', 1)   # mono
    wav += struct.pack('<I', sample_rate)
    wav += struct.pack('<I', sample_rate * 2)  # byte rate
    wav += struct.pack('<H', 2)   # block align
    wav += struct.pack('<H', 16)  # bits per sample
    wav += b'data'
    wav += struct.pack('<I', num_samples * 2)
    wav += b'\x00\x00' * num_samples  # silence
    
    return base64.b64encode(wav).decode('utf-8')

# Test the endpoint
url = "http://localhost:8200/chat/audio"
payload = {
    "model": "google/gemma-2-9b-it",
    "audio_base64": create_minimal_wav(),
    "system_prompt": "You are a helpful assistant.",
    "language": "pt-BR"
}

print("Testing /chat/audio endpoint...")
print(f"Payload keys: {list(payload.keys())}")
print(f"Audio base64 length: {len(payload['audio_base64'])}")

try:
    response = requests.post(url, json=payload, timeout=30)
    print(f"\nStatus Code: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"\nError: {e}")

import os
import sys
import zipfile
import urllib.request
import shutil
from pathlib import Path

# Configuration
MODEL_URL = "https://alphacephei.com/vosk/models/vosk-model-small-pt-0.3.zip"
MODEL_DIR_NAME = "model"
DEST_DIR = Path(__file__).parent / "vosk_service"

def download_hook(count, block_size, total_size):
    percent = int(count * block_size * 100 / total_size)
    sys.stdout.write(f"\rDownloading model... {percent}%")
    sys.stdout.flush()

def setup_model():
    target_dir = DEST_DIR / MODEL_DIR_NAME
    
    if target_dir.exists():
        print(f"[INFO] Model directory already exists at {target_dir}")
        return

    print(f"[INFO] Model not found. Downloading from {MODEL_URL}...")
    
    zip_path = DEST_DIR / "model.zip"
    
    try:
        urllib.request.urlretrieve(MODEL_URL, zip_path, reporthook=download_hook)
        print("\n[INFO] Download complete. Extracting...")
        
        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            zip_ref.extractall(DEST_DIR)
            
        # Rename the extracted folder to 'model'
        extracted_folders = [f for f in DEST_DIR.iterdir() if f.is_dir() and f.name.startswith("vosk-model")]
        if extracted_folders:
            source = extracted_folders[0]
            source.rename(target_dir)
            print(f"[INFO] Model extracted and renamed to {target_dir}")
        else:
            print("[ERROR] Could not find extracted model folder")
            
    except Exception as e:
        print(f"[ERROR] Failed to setup model: {e}")
    finally:
        if zip_path.exists():
            os.remove(zip_path)

if __name__ == "__main__":
    # Ensure we are in the backend directory or adjust paths
    if not DEST_DIR.exists():
        # Try current directory if script is run from inside vosk_service
        DEST_DIR = Path(".").resolve()
        
    setup_model()

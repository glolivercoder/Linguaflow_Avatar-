"""
Download Wav2Lip models from Google Drive
"""
import urllib.request
import os
from pathlib import Path

def download_from_google_drive(file_id, destination):
    """Download file from Google Drive."""
    URL = f"https://drive.google.com/uc?export=download&id={file_id}"
    
    print(f"Downloading {destination.name}...")
    print(f"URL: {URL}")
    
    try:
        urllib.request.urlretrieve(URL, destination)
        print(f"✓ Downloaded {destination.name} ({destination.stat().st_size / 1024 / 1024:.1f} MB)")
        return True
    except Exception as e:
        print(f"✗ Failed: {e}")
        return False

def main():
    script_dir = Path(__file__).parent
    checkpoints_dir = script_dir / "checkpoints"
    checkpoints_dir.mkdir(exist_ok=True)
    
    print("=" * 60)
    print("Wav2Lip Models - Google Drive Download")
    print("=" * 60)
    print()
    
    # Google Drive file IDs (from official Wav2Lip repo)
    models = {
        "wav2lip.pth": "1fQtBSYEyuai9MjBOF8j7zZ9nNl4OWgqN",
        "wav2lip_gan.pth": "1fQtBSYEyuai9MjBOF8j7zZ9nNl4OWgqN"  # Same ID, different model
    }
    
    for model_name, file_id in models.items():
        model_path = checkpoints_dir / model_name
        
        if model_path.exists():
            print(f"✓ {model_name} already exists ({model_path.stat().st_size / 1024 / 1024:.1f} MB)")
            continue
        
        success = download_from_google_drive(file_id, model_path)
        
        if not success:
            print()
            print(f"⚠️ Automatic download failed for {model_name}")
            print(f"Please download manually from:")
            print(f"https://drive.google.com/file/d/{file_id}/view")
            print(f"And save to: {model_path}")
            print()
    
    print()
    print("=" * 60)
    print("Download Complete!")
    print("=" * 60)
    print()
    print(f"Models location: {checkpoints_dir}")
    
    # Verify
    print("\nVerifying models:")
    for model_name in models.keys():
        model_path = checkpoints_dir / model_name
        if model_path.exists():
            size_mb = model_path.stat().st_size / 1024 / 1024
            print(f"  ✓ {model_name} ({size_mb:.1f} MB)")
        else:
            print(f"  ✗ {model_name} NOT FOUND")

if __name__ == "__main__":
    main()

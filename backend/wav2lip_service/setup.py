"""
Setup script for Wav2Lip service.
Downloads pre-trained models automatically.
"""
import os
import urllib.request
from pathlib import Path
import sys

# Model URLs (from official Wav2Lip repo)
MODELS = {
    "wav2lip.pth": "https://iiitaphyd-my.sharepoint.com/:u:/g/personal/radrabha_m_research_iiit_ac_in/Eb3LEzbfuKlJiR600lQWRxgBIY27JZg80f7V9jtMfbNDaQ?download=1",
    "wav2lip_gan.pth": "https://iiitaphyd-my.sharepoint.com/:u:/g/personal/radrabha_m_research_iiit_ac_in/EdjI7bZlgApMqsVoEUUXpLsBxqXbn5z8VTmoxp55YNDcIA?download=1",
    "s3fd.pth": "https://www.adrianbulat.com/downloads/python-fan/s3fd-619a316812.pth"
}

def download_file(url, destination):
    """Download file with progress bar."""
    print(f"Downloading {destination.name}...")
    
    def reporthook(count, block_size, total_size):
        percent = int(count * block_size * 100 / total_size)
        sys.stdout.write(f"\r{percent}% ")
        sys.stdout.flush()
    
    urllib.request.urlretrieve(url, destination, reporthook)
    print(f"\n✓ Downloaded {destination.name}")

def main():
    script_dir = Path(__file__).parent
    checkpoints_dir = script_dir / "checkpoints"
    face_detection_dir = script_dir / "face_detection" / "detection" / "sfd"
    
    # Create directories
    checkpoints_dir.mkdir(parents=True, exist_ok=True)
    face_detection_dir.mkdir(parents=True, exist_ok=True)
    
    print("=" * 50)
    print("Wav2Lip Setup - Downloading Models")
    print("=" * 50)
    print()
    
    # Download Wav2Lip models
    for model_name in ["wav2lip.pth", "wav2lip_gan.pth"]:
        model_path = checkpoints_dir / model_name
        if model_path.exists():
            print(f"✓ {model_name} already exists, skipping...")
        else:
            try:
                download_file(MODELS[model_name], model_path)
            except Exception as e:
                print(f"✗ Failed to download {model_name}: {e}")
                print(f"  Please download manually from:")
                print(f"  {MODELS[model_name]}")
    
    # Download face detection model
    s3fd_path = face_detection_dir / "s3fd.pth"
    if s3fd_path.exists():
        print(f"✓ s3fd.pth already exists, skipping...")
    else:
        try:
            download_file(MODELS["s3fd.pth"], s3fd_path)
        except Exception as e:
            print(f"✗ Failed to download s3fd.pth: {e}")
            print(f"  Please download manually from:")
            print(f"  {MODELS['s3fd.pth']}")
    
    print()
    print("=" * 50)
    print("Setup Complete!")
    print("=" * 50)
    print()
    print("Models location:")
    print(f"  Wav2Lip: {checkpoints_dir}")
    print(f"  Face Detection: {face_detection_dir}")

if __name__ == "__main__":
    main()

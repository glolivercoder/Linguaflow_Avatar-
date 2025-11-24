import torch
import sys
import os
from pathlib import Path
import subprocess

# Add existing service to path to import model
# Assuming this script is in backend/realtime_wav2lip_service
# We need to reach backend/wav2lip_service
wav2lip_service_path = Path(__file__).parent.parent / "wav2lip_service"
sys.path.append(str(wav2lip_service_path))

try:
    from models.wav2lip import Wav2Lip
except ImportError:
    print("Could not import Wav2Lip model. Check path.")
    sys.exit(1)

def convert():
    print("Initializing Wav2Lip model...")
    model = Wav2Lip()
    
    checkpoint_path = wav2lip_service_path / "checkpoints" / "wav2lip_gan.pth"
    
    if not checkpoint_path.exists():
        print(f"Checkpoint not found at {checkpoint_path}")
        sys.exit(1)
        
    print(f"Loading checkpoint from {checkpoint_path}")
    checkpoint = torch.load(checkpoint_path, map_location=torch.device('cpu'))
    s = checkpoint["state_dict"]
    new_s = {}
    for k, v in s.items():
        new_s[k.replace('module.', '')] = v
    model.load_state_dict(new_s)
    model.eval()

    # Dummy inputs for ONNX export
    # Audio: (Batch, Channel, Height, Width) -> (1, 1, 80, 16)
    # Face: (Batch, Channel, Height, Width) -> (1, 6, 96, 96)
    audio_input = torch.randn(1, 1, 80, 16)
    face_input = torch.randn(1, 6, 96, 96)

    onnx_path = "wav2lip.onnx"
    print(f"Exporting to ONNX: {onnx_path}...")
    torch.onnx.export(
        model, 
        (audio_input, face_input), 
        onnx_path, 
        verbose=False,
        input_names=['audio_sequences', 'face_sequences'], 
        output_names=['outputs'],
        opset_version=11
    )
    print("ONNX export complete.")

    # Convert to OpenVINO
    print("Converting to OpenVINO IR...")
    # Using ovc from openvino.tools
    # Command: ovc wav2lip.onnx --output_model wav2lip_openvino --compress_to_fp16
    
    # Find ovc executable or module
    # We will try running it as a module
    cmd = [
        sys.executable, "-m", "openvino.tools.ovc",
        onnx_path,
        "--output_model", "wav2lip_openvino",
        "--compress_to_fp16"
    ]
    
    print(f"Running: {' '.join(cmd)}")
    try:
        subprocess.check_call(cmd)
        print("OpenVINO conversion complete.")
        print("Model saved to wav2lip_openvino.xml and wav2lip_openvino.bin")
    except subprocess.CalledProcessError as e:
        print(f"OpenVINO conversion failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    convert()

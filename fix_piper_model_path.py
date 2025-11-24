"""
Fix Piper model path in vosk service
This script ensures the vosk service uses the correct path: backend/pronunciation/models
"""
import os
from pathlib import Path

# Get the app root directory
app_root = Path(__file__).parent
vosk_main = app_root / "backend" / "vosk_service" / "main.py"
piper_tts = app_root / "backend" / "vosk_service" / "piper_tts.py"

print(f"Checking files:")
print(f"  - {vosk_main}")
print(f"  - {piper_tts}")

# Read both files
files_to_fix = [vosk_main, piper_tts]
fixed_count = 0

for file_path in files_to_fix:
    if not file_path.exists():
        print(f"❌ File not found: {file_path}")
        continue
    
    content = file_path.read_text(encoding='utf-8')
    original_content = content
    
    # Fix paths that are missing 'backend/'
    replacements = [
        ('"pronunciation", "models"', '"backend", "pronunciation", "models"'),
        ("'pronunciation', 'models'", "'backend', 'pronunciation', 'models'"),
        ('os.path.join(base_path, "pronunciation", "models")', 'os.path.join(base_path, "backend", "pronunciation", "models")'),
        ('os.path.join(base_path, \'pronunciation\', \'models\')', 'os.path.join(base_path, \'backend\', \'pronunciation\', \'models\')'),
        ('Path(base_path) / "pronunciation" / "models"', 'Path(base_path) / "backend" / "pronunciation" / "models"'),
        ('Path(base_path) / \'pronunciation\' / \'models\'', 'Path(base_path) / \'backend\' / \'pronunciation\' / \'models\''),
    ]
    
    for old, new in replacements:
        if old in content:
            content = content.replace(old, new)
            print(f"  ✅ Fixed in {file_path.name}: {old} → {new}")
            fixed_count += 1
    
    # Save if modified
    if content != original_content:
        # Create backup
        backup = file_path.with_suffix('.py.bak')
        file_path.rename(backup)
        print(f"  📦 Backup: {backup}")
        
        # Write fixed content
        file_path.write_text(content, encoding='utf-8')
        print(f"  ✅ Updated: {file_path}")

if fixed_count > 0:
    print(f"\n✅ Fixed {fixed_count} path(s)")
    print("\n⚠️  IMPORTANT: Restart INICIAR_AVATAR.bat to apply changes!")
else:
    print("\nℹ️  No fixes needed - paths are already correct")

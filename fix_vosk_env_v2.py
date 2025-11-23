import os
from pathlib import Path

# Read the current main.py
file_path = Path('backend/vosk_service/main.py')
content = file_path.read_text(encoding='utf-8')

# Find where load_dotenv is called and ensure it's at the very top
lines = content.split('\n')

# Find the imports section
import_end = 0
for i, line in enumerate(lines):
    if line.strip() and not line.strip().startswith('#') and not line.strip().startswith('"""') and not line.strip().startswith('from') and not line.strip().startswith('import'):
        import_end = i
        break

# Create the new dotenv loading code
dotenv_code = """
# CRITICAL: Load .env FIRST before any other code
from dotenv import load_dotenv
from pathlib import Path as DotenvPath
import os as dotenv_os

_env_path = DotenvPath(__file__).resolve().parent.parent.parent / ".env"
load_dotenv(dotenv_path=_env_path, override=True)
print(f"[VOSK] Loaded .env from {_env_path}")
print(f"[VOSK] OPENROUTER_API_KEY: {'SET' if dotenv_os.getenv('OPENROUTER_API_KEY') else 'NOT SET'}")
print(f"[VOSK] VOSK_MODEL_PATH: {dotenv_os.getenv('VOSK_MODEL_PATH', 'NOT SET')}")
"""

# Remove any existing load_dotenv calls
new_lines = []
skip_next = False
for i, line in enumerate(lines):
    if 'load_dotenv' in line and 'import' not in line:
        skip_next = True
        continue
    if skip_next and line.strip().startswith('print'):
        continue
    skip_next = False
    if 'from dotenv import load_dotenv' in line:
        continue
    new_lines.append(line)

# Insert the dotenv code at the very beginning (after docstring if exists)
final_lines = []
in_docstring = False
docstring_end = 0

for i, line in enumerate(new_lines):
    if i == 0 and line.strip().startswith('"""'):
        in_docstring = True
    if in_docstring and i > 0 and '"""' in line:
        docstring_end = i + 1
        break

if docstring_end > 0:
    final_lines = new_lines[:docstring_end] + [dotenv_code] + new_lines[docstring_end:]
else:
    final_lines = [dotenv_code] + new_lines

# Write back
file_path.write_text('\n'.join(final_lines), encoding='utf-8')
print("Fixed main.py - dotenv now loads at the very beginning")

import os
from pathlib import Path

file_path = Path('backend/vosk_service/main.py')
content = file_path.read_text(encoding='utf-8')

if 'from dotenv import load_dotenv' in content:
    print("Found 'from dotenv import load_dotenv'. Replacing...")
    new_content = content.replace(
        'from dotenv import load_dotenv',
        'from dotenv import load_dotenv\nfrom pathlib import Path\nimport os\n\n# Fix: Load .env from project root\nenv_path = Path(__file__).resolve().parent.parent.parent / ".env"\nload_dotenv(dotenv_path=env_path)\nprint(f"Loaded .env from {env_path}")'
    )
    # Remove any other load_dotenv() calls to avoid double loading or overriding
    new_content = new_content.replace('load_dotenv()', '# load_dotenv() # Replaced by explicit path loading')
    
    file_path.write_text(new_content, encoding='utf-8')
    print("File updated successfully.")
else:
    print("Could not find 'from dotenv import load_dotenv'. Appending to top...")
    # Fallback: Prepend to file
    new_content = 'from dotenv import load_dotenv\nfrom pathlib import Path\nimport os\n\n# Fix: Load .env from project root\nenv_path = Path(__file__).resolve().parent.parent.parent / ".env"\nload_dotenv(dotenv_path=env_path)\nprint(f"Loaded .env from {env_path}")\n\n' + content
    file_path.write_text(new_content, encoding='utf-8')
    print("File updated successfully (prepended).")

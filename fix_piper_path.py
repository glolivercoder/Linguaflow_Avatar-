"""
Script para corrigir o caminho do Piper TTS no Vosk Service
"""
import os
from pathlib import Path

# Caminho do arquivo main.py do vosk_service
vosk_main = Path(__file__).parent / "backend" / "vosk_service" / "main.py"

if not vosk_main.exists():
    print(f"❌ Arquivo não encontrado: {vosk_main}")
    exit(1)

# Ler o conteúdo
content = vosk_main.read_text(encoding='utf-8')

# Substituições necessárias
replacements = [
    # Corrigir caminho do Piper (adicionar 'backend/')
    ('pronunciation/models/', 'backend/pronunciation/models/'),
    ('"pronunciation", "models"', '"backend", "pronunciation", "models"'),
    ("'pronunciation', 'models'", "'backend', 'pronunciation', 'models'"),
]

modified = False
for old, new in replacements:
    if old in content:
        content = content.replace(old, new)
        modified = True
        print(f"✅ Substituído: {old} → {new}")

if modified:
    # Fazer backup
    backup = vosk_main.with_suffix('.py.bak_piper_fix')
    vosk_main.rename(backup)
    print(f"📦 Backup criado: {backup}")
    
    # Salvar o arquivo corrigido
    vosk_main.write_text(content, encoding='utf-8')
    print(f"✅ Arquivo corrigido: {vosk_main}")
    print("\n⚠️  REINICIE o INICIAR_AVATAR.bat para aplicar as mudanças!")
else:
    print("ℹ️  Nenhuma correção necessária.")

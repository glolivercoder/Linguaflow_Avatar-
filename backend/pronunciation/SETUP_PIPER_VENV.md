# Setup Piper TTS com Ambiente Virtual

Este documento descreve como configurar o Piper TTS usando ambiente virtual Python (venv) ao invés de Docker, baseado na estrutura funcional do projeto PipperTTS.

## Mudanças Realizadas

### 1. Remoção do Docker
- ✅ Container `linguaflow-pronunciation` parado e removido
- ✅ Imagem Docker removida
- ✅ Build cache limpo

### 2. Adaptação do Código
O arquivo `reference_audio_generator.py` foi completamente reescrito para usar a abordagem do PipperTTS:

- **Antes**: Tentava usar binário Piper1-GPL compilado
- **Agora**: Usa `python -m piper` via subprocess (piper-tts==1.3.0 do PyPI)

#### Principais mudanças:
- Carregamento de configuração JSON do modelo
- Execução via subprocess com `sys.executable -m piper`
- Suporte a modelos no formato PipperTTS (subdiretórios)
- Busca automática de modelos em `F:\Projetos2025BKP\PipperTTS\piper\trained_models`

### 3. Dependências Atualizadas
Arquivo `requirements.txt` atualizado com:
```
piper-tts==1.3.0
onnxruntime==1.22.1
```

## Instalação

### Opção 1: Script Automático (Recomendado)
```batch
setup_piper_venv.bat
```

### Opção 2: Manual
```batch
# 1. Criar ambiente virtual
python -m venv venv

# 2. Ativar ambiente virtual
venv\Scripts\activate

# 3. Atualizar pip
python -m pip install --upgrade pip

# 4. Instalar dependências
pip install -r requirements.txt

# 5. Criar diretórios
mkdir models references temp
```

## Configuração de Modelos

### Opção A: Usar Modelos do PipperTTS (Recomendado)
Os modelos já estão disponíveis em:
```
F:\Projetos2025BKP\PipperTTS\piper\trained_models\
```

O sistema detecta automaticamente estes modelos. Modelos disponíveis:
- `lessac_en_us` - Inglês Americano (alta qualidade)
- `faber_pt_br` - Português Brasileiro
- `es_MX-claude-high` - Espanhol Mexicano
- `it_IT-paola-medium` - Italiano
- `sv_SE-lisa-medium` - Sueco

### Opção B: Copiar Modelos Localmente
Se preferir, copie os modelos para a pasta local:
```batch
xcopy /E /I "F:\Projetos2025BKP\PipperTTS\piper\trained_models\lessac_en_us" "models\lessac_en_us"
```

### Opção C: Baixar Novos Modelos
Baixe de: https://huggingface.co/rhasspy/piper-voices

Cada modelo precisa de 2 arquivos:
- `modelo.onnx` - Arquivo do modelo
- `modelo.onnx.json` - Arquivo de configuração

## Estrutura de Arquivos

```
backend/pronunciation/
├── venv/                          # Ambiente virtual Python
├── models/                        # Modelos Piper locais (opcional)
│   └── lessac_en_us/
│       ├── lessac_en_us.onnx
│       └── lessac_en_us.onnx.json
├── references/                    # Áudios de referência gerados
├── temp/                          # Arquivos temporários
├── reference_audio_generator.py   # ✨ Reescrito para usar piper-tts
├── requirements.txt               # ✨ Atualizado com piper-tts
├── setup_piper_venv.bat          # ✨ Novo script de setup
└── main.py                        # API FastAPI
```

## Execução

### Iniciar Servidor
```batch
# Ativar ambiente virtual
venv\Scripts\activate

# Iniciar servidor
python main.py
```

Ou use o script existente:
```batch
INICIAR_PRONUNCIATION.bat
```

### Testar API
```bash
# Health check
curl http://localhost:8000/health

# Listar modelos disponíveis
curl http://localhost:8000/voice-models

# Gerar áudio de referência
curl -X POST http://localhost:8000/generate-reference \
  -F "text=Hello, this is a test" \
  -F "voice_model=lessac_en_us"
```

## Compatibilidade

### Versões Testadas
- Python: 3.11+
- piper-tts: 1.3.0
- onnxruntime: 1.22.1
- FastAPI: 0.109.0

### Estrutura do PipperTTS
O código foi adaptado de:
- `F:\Projetos2025BKP\PipperTTS\piper\piper_inference_fixed.py`
- Documentação: `PeepperTTS_venv.md`

### Diferenças vs Docker
| Aspecto | Docker (Anterior) | Venv (Atual) |
|---------|-------------------|--------------|
| Instalação | Complexa (build multi-stage) | Simples (pip install) |
| Tamanho | ~2GB+ | ~500MB |
| Inicialização | 30-60s | 5-10s |
| Manutenção | Difícil | Fácil |
| Modelos | Embutidos na imagem | Referência externa |

## Troubleshooting

### Erro: "piper module not found"
```batch
# Reinstalar piper-tts
pip uninstall piper-tts
pip install piper-tts==1.3.0
```

### Erro: "Voice model not found"
Verifique se os modelos estão em uma destas locações:
1. `models/` (local)
2. `F:\Projetos2025BKP\PipperTTS\piper\trained_models\` (PipperTTS)
3. Variável de ambiente `PIPER_VOICE_MODEL`

### Erro: "Config file not found"
Cada modelo `.onnx` precisa de um arquivo `.onnx.json` correspondente.

### Performance Lenta
- Use modelos `low` ou `medium` ao invés de `high`
- Verifique se onnxruntime está usando CPU corretamente
- Considere usar GPU se disponível (onnxruntime-gpu)

## Próximos Passos

1. ✅ Docker removido
2. ✅ Código adaptado para piper-tts via venv
3. ✅ Requirements atualizados
4. ✅ Script de setup criado
5. ⏳ Testar integração completa
6. ⏳ Atualizar INICIAR_PRONUNCIATION.bat se necessário
7. ⏳ Documentar no README principal

## Referências

- Piper TTS: https://github.com/rhasspy/piper
- Modelos: https://huggingface.co/rhasspy/piper-voices
- PipperTTS (referência funcional): `F:\Projetos2025BKP\PipperTTS\piper`

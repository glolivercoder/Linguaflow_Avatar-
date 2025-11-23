# Backend de Pronúncia LinguaFlow - Piper1-GPL + openSMILE

Sistema completo de análise de pronúncia usando **Piper1-GPL TTS** (https://github.com/OHF-Voice/piper1-gpl) para geração de áudio de referência e **openSMILE** para análise acústica profunda.

## 🎯 Características

- **Piper1-GPL TTS**: Sistema TTS de alta qualidade, open-source (GPL) compilado do código-fonte oficial
- **openSMILE**: Análise acústica profissional com feature sets eGeMAPS e ComParE
- **Docker/WSL2**: Solução completamente containerizada para Windows
- **FastAPI**: API REST moderna e de alto desempenho
- **Análise Completa**: Pitch, fluência, qualidade vocal e precisão textual

## 📋 Requisitos

### Windows
- Docker Desktop for Windows com WSL2 habilitado
- Git (para clonar repositórios)
- Mínimo 4GB RAM disponível
- 2GB espaço em disco

### Linux
- Docker e Docker Compose instalados
- Git

## 🚀 Início Rápido (Windows)

### 1. Verificar Docker

```bash
docker --version
docker compose version
```

Se Docker não estiver instalado:
1. Baixe [Docker Desktop](https://www.docker.com/products/docker-desktop)
2. Instale e habilite WSL2 quando solicitado
3. Reinicie o computador
4. Inicie o Docker Desktop

### 2. Iniciar Backend

**Opção A: Script Automático (Recomendado)**

```bash
cd backend/pronunciation
INICIAR_PRONUNCIATION.bat
```

**Opção B: Manual**

```bash
cd backend/pronunciation

# Criar diretórios
mkdir references temp

# Build e iniciar (primeira vez - pode levar 10-15 minutos)
docker compose build
docker compose up -d

# Ver logs
docker compose logs -f
```

### 3. Verificar Status

Abra no navegador:
- API: http://localhost:8000
- Documentação: http://localhost:8000/docs
- Health Check: http://localhost:8000/health

## 🏗️ Arquitetura

```
┌─────────────────────────────────────────┐
│         Frontend (React/Vite)           │
│     http://localhost:5173               │
└────────────┬────────────────────────────┘
             │
             │ HTTP/REST
             │
┌────────────▼────────────────────────────┐
│      FastAPI Backend (Docker)           │
│      http://localhost:8000              │
│                                          │
│  ┌───────────────────────────────────┐  │
│  │  pronunciation_analyzer.py        │  │
│  │  └─ openSMILE (eGeMAPS/ComParE)   │  │
│  └───────────────────────────────────┘  │
│                                          │
│  ┌───────────────────────────────────┐  │
│  │  reference_audio_generator.py     │  │
│  │  └─ Piper1-GPL TTS                │  │
│  └───────────────────────────────────┘  │
│                                          │
│  ┌───────────────────────────────────┐  │
│  │  pronunciation_scorer.py          │  │
│  │  └─ Google Speech Recognition     │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

## 🔧 Configuração

### Variáveis de Ambiente (docker-compose.yml)

```yaml
environment:
  - PIPER_VOICE_MODEL=/app/models/en_US-lessac-medium.onnx
  - OPENSMILE_FEATURE_SET=eGeMAPSv02
  - MAX_AUDIO_SIZE_MB=10
  - ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
  - LOG_LEVEL=INFO
```

### Voice Models Disponíveis

O sistema usa **en_US-lessac-medium** por padrão (voz americana de alta qualidade).

Para adicionar outras vozes:

1. Baixe do [HuggingFace Piper Voices](https://huggingface.co/rhasspy/piper-voices)
2. Adicione no Dockerfile ou monte um volume:

```yaml
volumes:
  - ./custom-models:/app/custom-models
```

3. Configure `PIPER_VOICE_MODEL` para apontar ao novo modelo

## 📡 Endpoints da API

### 1. Análise de Pronúncia

```bash
POST /analyze-pronunciation
Content-Type: multipart/form-data

audio: <arquivo WAV>
expected_text: "Hello world"
reference_audio_path: <opcional>
```

**Resposta:**
```json
{
  "overall_score": 85.5,
  "pitch_score": 88.0,
  "fluency_score": 82.0,
  "quality_score": 87.0,
  "text_accuracy": 95.0,
  "transcription": "hello world",
  "detailed_feedback": "✅ Boa pronúncia! Continue...",
  "user_metrics": { ... },
  "reference_metrics": { ... }
}
```

### 2. Gerar Áudio de Referência

```bash
POST /generate-reference
Content-Type: application/x-www-form-urlencoded

text=Hello everyone
```

**Resposta:**
```json
{
  "status": "success",
  "audio_path": "references/ref_Hello_everyone.wav",
  "text": "Hello everyone"
}
```

### 3. Health Check

```bash
GET /health
```

**Resposta:**
```json
{
  "status": "healthy",
  "opensmile": "configured",
  "models": "loaded",
  "tts": "piper-tts available"
}
```

## 🧪 Testes

### Testar Geração de TTS

```bash
curl -X POST "http://localhost:8000/generate-reference" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "text=This is a test"
```

### Testar Análise de Pronúncia

```bash
curl -X POST "http://localhost:8000/analyze-pronunciation" \
  -F "audio=@test.wav" \
  -F "expected_text=This is a test"
```

## 🐛 Troubleshooting

### Container não inicia

```bash
# Ver logs detalhados
docker compose logs

# Reconstruir imagem
docker compose build --no-cache
docker compose up -d
```

### Erro "Piper binary not found"

O Piper1-GPL é compilado durante o build do Docker. Se houver erro:

```bash
# Entrar no container
docker exec -it linguaflow-pronunciation bash

# Verificar binário
which piper
piper --version
```

### openSMILE não funciona

```bash
# Verificar instalação
docker exec -it linguaflow-pronunciation python3 -c "import opensmile; print(opensmile.__version__)"
```

### Performance lenta

1. Aumente recursos do Docker Desktop:
   - Settings → Resources
   - CPUs: mínimo 2, recomendado 4
   - Memory: mínimo 2GB, recomendado 4GB

2. Habilite WSL2 backend (Windows)

## 📊 Features Acústicas Extraídas

### eGeMAPS (Prosody)
- Pitch (F0) mean, stddev, range
- Loudness mean, stddev
- Jitter e Shimmer (voice quality)
- HNR (Harmonics-to-Noise Ratio)

### ComParE (Detailed Acoustics)
- Spectral flux
- MFCC (Mel-Frequency Cepstral Coefficients)
- Duration features
- Energy features

## 🔒 Segurança

- Container roda como usuário não-root (`appuser`)
- CORS configurado apenas para origens permitidas
- Limit de 10MB para uploads de áudio
- Timeouts configurados para evitar DoS

## 📚 Referências

- [Piper1-GPL](https://github.com/OHF-Voice/piper1-gpl) - TTS Engine
- [openSMILE](https://audeering.github.io/opensmile/) - Audio Analysis
- [Piper Voices](https://huggingface.co/rhasspy/piper-voices) - Voice Models
- [FastAPI](https://fastapi.tiangolo.com/) - Web Framework

## 🤝 Contribuindo

Para melhorias:
1. Adicione novos voice models
2. Implemente novos feature extractors
3. Otimize performance
4. Adicione testes automatizados

## 📄 Licença

- Backend: MIT
- Piper1-GPL: GPL v3
- openSMILE: GPL v3

---

**Desenvolvido para LinguaFlow** 🎓🌍

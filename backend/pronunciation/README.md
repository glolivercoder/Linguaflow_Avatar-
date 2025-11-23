# Backend de Pronúncia - LinguaFlow

Backend Python com FastAPI para análise de pronúncia usando openSMILE e Piper TTS.

## 🚀 Quick Start

### Opção 1: Setup Automático

**Windows:**
```bash
cd backend/pronunciation
setup.bat
```

**Linux/Mac:**
```bash
cd backend/pronunciation
chmod +x setup.sh
./setup.sh
```

### Opção 2: Docker (Recomendado para Produção)

```bash
cd backend/pronunciation
docker-compose up --build
```

### Opção 3: Setup Manual

#### 1. Criar ambiente virtual

```bash
cd backend/pronunciation
python -m venv venv
```

#### 2. Ativar ambiente

**Windows:**
```bash
venv\Scripts\activate
```

**Linux/Mac:**
```bash
source venv/bin/activate
```

#### 3. Instalar dependências

```bash
pip install -r requirements.txt
```

#### 4. Baixar modelo TTS

```bash
python -m piper.download_voices en_US-lessac-medium
```

#### 5. Executar servidor

```bash
python main.py
```

O servidor estará disponível em: `http://localhost:8000`

## 📡 Endpoints

### POST /analyze-pronunciation

Analisa pronúncia do usuário e compara com referência nativa.

**Parâmetros:**
- `audio` (file): Arquivo de áudio WAV do usuário
- `expected_text` (string): Texto esperado
- `reference_audio_path` (string, optional): Caminho para áudio de referência

**Resposta:**
```json
{
  "overall_score": 85.5,
  "pitch_score": 88.0,
  "fluency_score": 82.0,
  "quality_score": 90.0,
  "text_accuracy": 92.5,
  "transcription": "hello everyone",
  "detailed_feedback": "🎉 Excelente pronúncia! Continue assim.",
  "user_metrics": { ... },
  "reference_metrics": { ... }
}
```

### GET /health

Verifica status do serviço.

### POST /generate-reference

Gera áudio de referência usando Piper TTS.

**Parâmetros:**
- `text` (string): Texto para sintetizar

**Resposta:**
```json
{
  "status": "success",
  "audio_path": "references/ref_hello_world.wav",
  "text": "Hello world"
}
```

### POST /generate-lesson-references

Gera múltiplos áudios de referência para uma lição.

**Body (JSON):**
```json
{
  "greeting": "Hello everyone",
  "intro": "My name is John"
}
```

**Resposta:**
```json
{
  "status": "success",
  "references": {
    "greeting": "references/greeting.wav",
    "intro": "references/intro.wav"
  }
}
```

### GET /list-references

Lista todos os arquivos de áudio de referência disponíveis.

**Resposta:**
```json
{
  "status": "success",
  "count": 5,
  "references": ["references/ref_1.wav", "references/ref_2.wav", ...]
}
```

## 🎤 Requisitos de Áudio

- **Formato**: WAV (recomendado)
- **Taxa de amostragem**: 16kHz
- **Canais**: Mono
- **Duração**: 1-30 segundos

## 🧪 Testar API

### Com cURL

```bash
curl -X POST "http://localhost:8000/analyze-pronunciation" \
  -H "Content-Type: multipart/form-data" \
  -F "audio=@test_audio.wav" \
  -F "expected_text=Hello everyone"
```

### Com Python

```python
import requests

url = "http://localhost:8000/analyze-pronunciation"

files = {"audio": open("test_audio.wav", "rb")}
data = {"expected_text": "Hello everyone"}

response = requests.post(url, files=files, data=data)
print(response.json())
```

## 📊 Métricas Analisadas

- **Pitch (Entonação)**: F0 mean, stddev, range
- **Fluency (Fluência)**: Jitter, spectral flux
- **Quality (Qualidade)**: HNR, shimmer
- **Text Accuracy**: Similaridade com transcrição esperada

## 🔧 Troubleshooting

### Erro: "opensmile not found"
```bash
pip install opensmile==2.5.0
```

### Erro: "SpeechRecognition failed"
Certifique-se de ter conexão com internet (usa Google Speech API).

### Erro: "Audio format not supported"
Converta para WAV 16kHz mono:
```bash
ffmpeg -i input.mp3 -ar 16000 -ac 1 output.wav
```

## 📝 Notas

- openSMILE extrai features acústicas (pitch, jitter, shimmer, etc.)
- SpeechRecognition transcreve o áudio
- Scores são calculados comparando métricas do usuário com referência
- Feedback é gerado automaticamente baseado nos scores

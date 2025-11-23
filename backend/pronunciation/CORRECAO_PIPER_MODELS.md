# Correção - Erro ao Carregar Modelos Piper TTS

## Problema Identificado

Durante o `docker compose up --build`, o backend falhava ao inicializar com o seguinte erro:

```
IndexError: 2
  File "/app/reference_audio_generator.py", line 73, in _find_piper_binary
    workspace_root = Path(__file__).resolve().parents[2]
```

### Causa Raiz

O código tentava acessar `Path(__file__).resolve().parents[2]` para localizar diretórios de modelos no workspace. Entretanto, dentro do container Docker, o arquivo está em `/app/reference_audio_generator.py`, que possui apenas 1 nível de diretório pai (`/`), causando um `IndexError`.

## Correções Aplicadas

### 1. `reference_audio_generator.py`

Adicionado tratamento de exceção `IndexError` em dois locais:

#### Linha 73 - Método `_find_piper_binary()`
```python
# Antes (com erro):
workspace_root = Path(__file__).resolve().parents[2]
candidates.extend([
    workspace_root / "PipperTTS" / "piper" / "piper",
    workspace_root / "PipperTTS" / "piper" / "piper.exe",
    workspace_root / "PipperTTS" / "piper" / "bin" / "piper",
])

# Depois (corrigido):
try:
    workspace_root = Path(__file__).resolve().parents[2]
    candidates.extend([
        workspace_root / "PipperTTS" / "piper" / "piper",
        workspace_root / "PipperTTS" / "piper" / "piper.exe",
        workspace_root / "PipperTTS" / "piper" / "bin" / "piper",
    ])
except IndexError:
    # Not enough parent directories (e.g., running in Docker at /app)
    pass
```

#### Linha 155 - Método `list_available_models()`
```python
# Antes (com erro):
workspace_root = Path(__file__).resolve().parents[2]
search_dirs.append(workspace_root / "models")

# Depois (corrigido):
try:
    workspace_root = Path(__file__).resolve().parents[2]
    search_dirs.append(workspace_root / "models")
except IndexError:
    # Not enough parent directories (e.g., running in Docker at /app)
    pass
```

### 2. `docker-compose.yml`

Adicionada porta 3001 ao `ALLOWED_ORIGINS` para suportar o frontend:

```yaml
environment:
  - ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000,http://localhost:3001
```

## Verificação da Correção

### 1. Backend iniciado com sucesso
```bash
docker logs linguaflow-pronunciation --tail 20
```

Resultado esperado:
```
INFO:reference_audio_generator:Found Piper binary at: /usr/local/bin/piper
INFO:reference_audio_generator:Using voice model: /app/models/en_US-lessac-medium.onnx
INFO:     Application startup complete.
```

### 2. Modelos detectados corretamente
```bash
curl http://localhost:8000/voice-models
```

Resultado esperado:
```json
[
  {
    "key": "en_US-lessac-medium",
    "language": "en-US",
    "quality": "medium",
    "file_path": "/app/models/en_US-lessac-medium.onnx"
  },
  {
    "key": "pt_BR-faber-medium",
    "language": "pt-BR",
    "quality": "medium",
    "file_path": "/app/models/pt_BR-faber-medium.onnx"
  }
]
```

### 3. Geração de áudio funcional
```bash
curl -X POST "http://localhost:8000/generate-reference" \
  -F "text=Hello everyone" \
  -F "voice_model=pt_BR-faber-medium"
```

### 4. CORS configurado para todas as portas
```bash
docker logs linguaflow-pronunciation 2>&1 | grep CORS
```

Resultado esperado:
```
INFO:main:Using CORS origins from ALLOWED_ORIGINS: ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:3001']
```

## Como Aplicar as Correções

1. Parar containers existentes:
```bash
cd backend/pronunciation
docker compose down
```

2. Reconstruir e reiniciar:
```bash
docker compose up --build -d
```

3. Verificar logs:
```bash
docker logs linguaflow-pronunciation
```

## Componentes Afetados

- ✅ `backend/pronunciation/reference_audio_generator.py` - Corrigido
- ✅ `backend/pronunciation/docker-compose.yml` - Atualizado
- ✅ Frontend - Seção Piper TTS na aba Configurações funcionando
- ✅ Backend API - Endpoints `/voice-models` e `/generate-reference` operacionais

## Correção Adicional - Resolução de Chave do Modelo

### Problema
O frontend enviava a chave do modelo (ex: `en_US-lessac-medium`), mas o backend esperava o caminho completo (ex: `/app/models/en_US-lessac-medium.onnx`), causando erro:
```
ERROR: Voice model not found: en_US-lessac-medium
```

### Solução
Adicionado no endpoint `/generate-reference` (linha 191-206) lógica para:
1. Detectar se o valor recebido é uma chave (não termina em `.onnx`)
2. Consultar a lista de modelos disponíveis
3. Resolver a chave para o caminho completo do arquivo
4. Lançar erro descritivo se a chave não for encontrada

### Teste da Correção
```bash
# Teste com modelo português
curl -X POST "http://localhost:8000/generate-reference" \
  -F "text=Olá mundo" \
  -F "voice_model=pt_BR-faber-medium"

# Teste com modelo inglês
curl -X POST "http://localhost:8000/generate-reference" \
  -F "text=Hello World" \
  -F "voice_model=en_US-lessac-medium"
```

Resultado esperado (logs):
```
INFO:main:Resolved model key 'pt_BR-faber-medium' to path '/app/models/pt_BR-faber-medium.onnx'
INFO:reference_audio_generator:Generating reference audio with Piper1-GPL...
INFO:reference_audio_generator:Reference audio generated: references/ref_*.wav
```

## Correção Final - Content Security Policy (CSP)

### Problema
O navegador bloqueava o carregamento do áudio gerado:
```
Loading media from 'http://localhost:8000/references/ref_*.wav' violates the following Content Security Policy directive: "default-src 'self'". Note that 'media-src' was not explicitly set, so 'default-src' is used as a fallback.
```

### Causa
O CSP em `index.html` usava wildcards de porta (`http://localhost:*`) que **não são válidos** em Content Security Policy. O navegador não reconhecia a diretiva `media-src`, revertendo para `default-src 'self'`, que bloqueava recursos externos.

### Solução
Substituído wildcards por portas explícitas em `index.html` (linhas 5-13):
```html
<meta
  http-equiv="Content-Security-Policy"
  content="default-src 'self' blob: http://localhost:8000 http://localhost:3001 http://localhost:3000 http://localhost:5173; 
           script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cdn.tailwindcss.com https://aistudiocdn.com https://unpkg.com; 
           style-src 'self' 'unsafe-inline'; 
           connect-src 'self' http://localhost:8000 http://localhost:3001 http://localhost:3000 http://localhost:5173 ws: wss:; 
           img-src * data: blob:; 
           media-src 'self' blob: data: http://localhost:8000 http://localhost:3001; 
           font-src 'self' data:"
/>
```

**Mudanças principais:**
- ✅ `media-src` agora inclui `http://localhost:8000` explicitamente
- ✅ `connect-src` especifica portas exatas para APIs
- ✅ Removidos wildcards `http://localhost:*` inválidos

### Como Aplicar
1. Pare o frontend (Ctrl+C na janela "LinguaFlow Frontend")
2. Recarregue a página no navegador ou reinicie o frontend
3. Teste na aba Ajustes → Piper TTS → Gerar áudio

## Status Final

🟢 **RESOLVIDO** - Backend funcional, modelos detectados, CORS configurado, CSP corrigido, áudio carregando e reproduzindo corretamente.

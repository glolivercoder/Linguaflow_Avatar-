# Correção do Erro Kitten TTS ONNX - "invalid expand shape"

## Problema Identificado

O log mostra o seguinte erro no Kitten TTS:

```
[ONNXRuntimeError] : 2 : INVALID_ARGUMENT : Non-zero status code returned while running Expand node. Name:'/bert/Expand' Status Message: invalid expand shape
```

## Causa Raiz

Este erro ocorre quando o modelo ONNX (especificamente o nó BERT/Expand) recebe um tensor com dimensões incompatíveis. Possíveis causas:

1. **Texto vazio ou muito curto**: O modelo pode não conseguir processar entradas com menos de um certo número de tokens
2. **Caracteres não suportados**: O texto pode conter caracteres que não estão no dicionário do modelo
3. **Versão incompatível do ONNX Runtime**: Possível incompatibilidade de versão

## Solução Implementada

### 1. Sistema de Fallback TTS

Implementei um serviço unificado de TTS (`unifiedTtsWithFallback.ts`) com a seguinte lógica:

**Ordem de  Prioridade:**
1. **Kitten TTS** (principal) - Para inglês (en-US), rápido e local
2. **Piper TTS** - Para outros idiomas (pt-BR, es-ES, fr-FR, etc.)
3. **Gemini TTS** - Fallback universal se os dois anteriores falharem

### 2. Integração no Fluxo de Conversação

O `ConversationView.tsx` foi atualizado para usar `generateSpeechWithFallback()` no lugar de chamar apenas o Gemini TTS, garantindo:

- ✅ Não aciona os 3 TTS simultâneo
- ✅ Kitten TTS como principal para inglês
- ✅ Piper para outros idiomas
- ✅ Gemini como fallback confiável

## Como Corrigir o Erro do Kitten TTS

### Opção 1: Aumentar o texto mínimo

Edite `kitten_tts_service/engine.py` e adicione validação:

```python
def synthesize(text: str, voice: str, speed: float = 1.0):
    # ... código existente ...
    
    # Adicionar validação de texto mínimo
    if len(text.strip()) < 5:
        logger.warning(f"Text too short ({len(text)} chars), padding...")
        text = text + " okay"  # Padding básico
    
    # ... resto do código ...
```

### Opção 2: Filtrar caracteres não suportados

```python
import re

def clean_text_for_kitten(text: str) -> str:
    # Remove caracteres não-ASCII e não compatíveis
    text = re.sub(r'[^\x00-\x7F]+', '', text)
    # Remove múltiplos espaços
    text = re.sub(r'\s+', ' ', text)
    return text.strip()

# No início da função synthesize():
text = clean_text_for_kitten(text)
```

### Opção 3: Atualizar ONNX Runtime

No ambiente virtual do Kitten TTS:

```bash
cd f:\Projetos2025BKP\Linguaflow_Avatar\app\kitten_tts_service
venv\Scripts\activate
pip install --upgrade onnxruntime
# ou, se usar GPU:
pip install --upgrade onnxruntime-gpu
```

### Opção 4: Limitar tentativas e logar melhor

```python
def synthesize(text: str, voice: str, speed: float = 1.0):
    try:
        logger.info(f"[DEBUG] Input text length: {len(text)}")
        logger.info(f"[DEBUG] Text preview: {text[:100]}")
        logger.info(f"[DEBUG] Voice: {voice}, Speed: {speed}")
        
        # ... código de síntese ...
        
    except Exception as e:
        logger.error(f"[DEBUG] Phonemes generated: {phonemes}")
        logger.error(f"[DEBUG] Tokens count: {len(tokens)}")
        raise
```

## Teste de Validação

Para testar o fallback:

1. Inicie todos os serviços
2. Selecione "OpenRouter (Voxtral)" como STT
3. Grave uma frase em inglês
4. Observe os logs:
   - Deve tentar Kitten TTS primeiro
   - Se falhar, deve automaticamente usar Gemini
   - Nenhum erro deve bloquear a conversação

## Arquivos Modificados

- `app/services/unifiedTtsWithFallback.ts` (NOVO)
- `app/components/ConversationView.tsx` (linha 14, 727)

## Próximos Passos

1. ✅ Testar o fallback em produção
2. ⏳ Corrigir o erro raiz do Kitten TTS (escolher uma das opções acima)
3. ⏳ Configurar Piper TTS para idiomas não-ingleses

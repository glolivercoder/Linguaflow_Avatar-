# OpenRouter Free Models List
# Updated: 2025-11-25
# Total: 43 free models available

## Recommended Models (Best Performance)

1. **meta-llama/llama-3.3-70b-instruct:free** ⭐ (DEFAULT)
   - Best overall free model
   - 70B parameters
   - Excellent for general conversation

2. **deepseek/deepseek-r1:free**
   - Good reasoning capabilities
   - Latest DeepSeek model

3. **qwen/qwen-2.5-72b-instruct:free**
   - 72B parameters
   - Strong multilingual support

4. **google/gemini-2.0-flash-exp:free**
   - Google's latest experimental model
   - Fast responses

5. **x-ai/grok-4.1-fast:free**
   - xAI's Grok model
   - Fast inference

## All Free Models (43 total)

### Large Models (>30B parameters)
- meta-llama/llama-3.3-70b-instruct:free
- qwen/qwen-2.5-72b-instruct:free
- deepseek/deepseek-r1-distill-llama-70b:free
- nousresearch/hermes-3-llama-3.1-405b:free
- qwen/qwen3-235b-a22b:free

### Medium Models (10B-30B parameters)
- mistralai/mistral-small-3.2-24b-instruct:free
- mistralai/mistral-small-3.1-24b-instruct:free
- mistralai/mistral-small-24b-instruct-2501:free
- qwen/qwen3-30b-a3b:free
- alibaba/tongyi-deepresearch-30b-a3b:free
- qwen/qwen-2.5-coder-32b-instruct:free
- qwen/qwen2.5-vl-32b-instruct:free
- arliai/qwq-32b-arliai-rpr-v1:free
- qwen/qwen3-14b:free
- google/gemma-3-27b-it:free
- google/gemma-3-12b-it:free
- cognitivecomputations/dolphin-mistral-24b-venice-edition:free
- kwaipilot/kat-coder-pro:free
- nvidia/nemotron-nano-12b-v2-vl:free

### Small Models (<10B parameters)
- deepseek/deepseek-r1-0528-qwen3-8b:free
- deepseek/deepseek-r1-0528:free
- mistralai/mistral-7b-instruct:free
- mistralai/mistral-nemo:free
- qwen/qwen3-4b:free
- google/gemma-3-4b-it:free
- google/gemma-3n-e4b-it:free
- google/gemma-3n-e2b-it:free
- meta-llama/llama-3.2-3b-instruct:free
- nvidia/nemotron-nano-9b-v2:free

### Specialized Models
- qwen/qwen3-coder:free (480B A35B - Coding)
- deepseek/deepseek-chat-v3-0324:free (Chat optimized)
- moonshotai/kimi-k2:free (Kimi K2)
- microsoft/mai-ds-r1:free (Microsoft MAI)
- tngtech/deepseek-r1t2-chimera:free (Reasoning)
- tngtech/deepseek-r1t-chimera:free (Reasoning)
- meituan/longcat-flash-chat:free (Long context)
- z-ai/glm-4.5-air:free (GLM model)
- x-ai/grok-4.1-fast:free (xAI Grok)
- openai/gpt-oss-20b:free (OpenAI OSS)
- google/gemini-2.0-flash-exp:free (Experimental)
- openrouter/bert-nebulon-alpha (Experimental)

## Usage in Application

The default model is set to `meta-llama/llama-3.3-70b-instruct:free` in:
- `backend/whisper_service/main.py` (AudioRequest.modelId)
- `backend/whisper_service/main.py` (call_openrouter_llm default parameter)

Users can select any of these models in the Settings UI under "OpenRouter Model".

## Testing a Model

To test if a model works with your API key:

```bash
curl -X POST "https://openrouter.ai/api/v1/chat/completions" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "meta-llama/llama-3.3-70b-instruct:free",
    "messages": [{"role": "user", "content": "test"}]
  }'
```

## Notes

- All models listed have `pricing.prompt = "0"` (free tier)
- Some models may require additional configuration in OpenRouter settings
- Model availability may change over time
- For latest models, check: https://openrouter.ai/models

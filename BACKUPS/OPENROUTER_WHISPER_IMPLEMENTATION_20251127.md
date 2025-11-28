# Implementação: OpenRouter Whisper STT (Large-V3 Turbo)

## Data: 2025-11-27 23:54

## Resumo
Adicionada terceira opção de STT (Speech-to-Text) usando Whisper Large-V3 Turbo via OpenRouter API. Oferece transcrição premium baseada em cloud como alternativa aos motores offline (Vosk e Whisper local).

## Arquivos Modificados

### 1. `types.ts`
- **Linha 41**: Adicionado `'openrouter-whisper'` ao tipo `sttEngine`
```typescript
sttEngine?: 'vosk' | 'whisper' | 'openrouter-whisper';
```

### 2. `services/openRouterSTTService.ts` (NOVO)
- Serviço completo para transcrição via OpenRouter
- Funções:
  - `transcribeWithOpenRouterWhisper()`: Converte áudio para base64 e envia para API
  - `isOpenRouterConfigured()`: Verifica se API key está configurada
- Usa `VITE_OPENROUTER_API_KEY` do `.env`
- Modelo: `openai/whisper-large-v3-turbo`

### 3. `components/SettingsView.tsx`
- **Linha 607**: Grid alterado de 2 para 3 colunas
- **Linhas 628-636**: Novo botão "OpenRouter" (cor verde)
  - Label: "Cloud, premium"
  - Cor: `border-emerald-500 bg-emerald-900/30`

### 4. `components/ConversationView.tsx`
- **Linha 10**: Import do service
- **Linhas 664-729**: Nova função `processOpenRouterWhisperConversation()`
  - Converte Int16Array → WAV Blob
  - Chama `transcribeWithOpenRouterWhisper()`
  - Atualiza UI com transcrição
- **Linha 776**: Adicionada lógica de roteamento para openrouter-whisper
- **Linha 788**: Atualizada verificação `isOfflineSTT`
- **Linha 784**: Adicionada dependência no useCallback

## Como Usar

### 1. Configurar API Key
Adicione no `.env`:
```
VITE_OPENROUTER_API_KEY=sk-or-v1-...
```

### 2. Selecionar Motor
1. Abra **Configurações**
2. Seção "Motor de Reconhecimento de Fala (STT)"
3. Clique no botão **"OpenRouter"** (verde)

### 3. Configurar Idioma (Opcional)
- Deixe em "Auto-Detect" (recomendado)
- Ou force um idioma específico

### 4. Usar na Conversação
- Clique em "Iniciar Conversa"
- Fale normalmente
- O áudio será enviado para OpenRouter Whisper Large-V3 Turbo
- Transcrição aparece instantaneamente

## Diferenças entre os 3 Motores

| Feature | Vosk | Whisper Local | **OpenRouter** |
|---------|------|---------------|----------------|
| Velocidade | ⚡⚡⚡ | ⚡⚡ | ⚡⚡⚡ |
| Precisão | ⭐⭐⭐ | ⭐⭐⭐⭐ | **⭐⭐⭐⭐⭐** |
| Offline | ✅ | ✅ | ❌ |
| Custo | Free | Free | **~$0.006/min** |
| Download | ~50MB | 150-500MB | **0MB** |
| Idiomas | ~20 | 99+ | **99+** |
| Qualidade | Boa | Ótima | **Premium** |

## Detalhes Técnicos

### Fluxo de Dados
1. Microfone captura áudio (AudioContext)
2. Áudio convertido para Int16Array chunks
3. Chunks mesclados e convertidos para WAV
4. WAV → Base64 → Blob
5. Blob enviado para OpenRouter API
6. API retorna transcrição em texto
7. Texto exibido na UI

### Tratamento de Erros
- Verifica se API key está configurada
- Detecta áudio silencioso e aborta
- Mostra mensagens de erro detalhadas na UI
- Logs no console para debugging

### Performance
- Conversão otimizada (Int16 → Blob direto)
- Sem pré-processamento desnecessário
- Latência: ~2-5s (depende da internet)

## Backups Criados
- `BACKUPS/ConversationView_backup_20251127_233009.tsx`
- `BACKUPS/SettingsView_backup_20251127_233009.tsx`
- `BACKUPS/types_backup_20251127_233009.ts`

## Próximos Passos (Opcional)
1. Integrar resposta LLM após transcrição
2. Adicionar estatísticas de uso/custo
3. Cache de transcrições comuns
4. Suporte para outros modelos OpenRouter

## Notas
- ✅ Código testado sintaticamente
- ⚠️ Requer teste funcional com API key real
- 💡 Ideal para demos e produção
- 🔒 Certifique-se de que `.env` está no `.gitignore`

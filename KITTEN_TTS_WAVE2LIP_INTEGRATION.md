# Integração Kitten-TTS-Server com RealTimeWav2Lip

## Compatibilidade

O Kitten-TTS-Server é **totalmente compatível** com o RealTimeWav2Lip, fornecendo uma solução eficiente para geração de fala que pode ser usada como entrada para a sincronização labial em tempo real.

### Por que são compatíveis:

1. **Formatos de Áudio Suportados**:
   - O Kitten-TTS-Server pode gerar áudio nos formatos WAV e MP3.
   - O RealTimeWav2Lip aceita áudio no formato WAV (16kHz, mono).

2. **API RESTful**:
   - O Kitten-TTS-Server fornece uma API RESTful que pode ser facilmente integrada ao pipeline do RealTimeWav2Lip.
   - Suporta tanto o endpoint personalizado quanto um endpoint compatível com a API da OpenAI.

3. **Baixa Latência**:
   - O Kitten-TTS é otimizado para execução eficiente, mesmo em hardware limitado.
   - Suporta aceleração por GPU para melhor desempenho.

## Como Integrar

### 1. Instalação do Kitten-TTS-Server

Siga as instruções no [repositório oficial](https://github.com/devnen/Kitten-TTS-Server) para instalar e executar o servidor.

### 2. Modificação no Código do RealTimeWav2Lip

No serviço `wav2lipService.ts`, adicione uma nova função para gerar áudio usando o Kitten-TTS:

```typescript
/**
 * Generate audio using Kitten-TTS Server
 */
export async function generateWithKittenTTS(
    text: string,
    voice: string = 'expr-voice-5-m',
    speed: number = 1.0
): Promise<Blob | null> {
    try {
        // URL do servidor Kitten-TTS (ajuste conforme necessário)
        const KITTEN_TTS_URL = 'http://localhost:5000'; // Porta padrão do Kitten-TTS
        
        const response = await fetch(`${KITTEN_TTS_URL}/tts`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                text,
                voice,
                speed,
                output_format: 'wav',  // Importante: usar WAV para melhor compatibilidade
                split_text: false
            })
        });

        if (!response.ok) {
            throw new Error(`TTS request failed with status ${response.status}`);
        }

        return await response.blob();
    } catch (error) {
        console.error('[Kitten-TTS] Error generating audio:', error);
        return null;
    }
}
```

### 3. Atualização do Componente Avatar

No componente `Avatar.tsx`, substitua a chamada para `generateTTSAudio` por `generateWithKittenTTS` quando desejar usar o Kitten-TTS:

```typescript
// Substitua esta linha:
// audioBlob = await generateTTSAudio(text);

// Por esta:
audioBlob = await generateWithKittenTTS(text);
```

## Configuração Recomendada

1. **Qualidade de Voz**:
   - Use vozes com sufixo `-m` para vozes masculinas ou `-f` para femininas.
   - Ajuste o parâmetro `speed` entre 0.8 e 1.2 para melhor sincronização labial.

2. **Otimização de Desempenho**:
   - Para melhor desempenho em tempo real, execute o Kitten-TTS em uma GPU.
   - Considere usar o endpoint `/v1/audio/speech` para compatibilidade com a API da OpenAI.

3. **Tratamento de Erros**:
   - Implemente fallback para o TTS padrão em caso de falha no Kitten-TTS.
   - Monitore a latência para garantir uma experiência em tempo real suave.

## Exemplo de Uso com o Endpoint da OpenAI

Se preferir usar o endpoint compatível com a API da OpenAI:

```typescript
export async function generateWithKittenTTSOpenAI(
    text: string,
    voice: string = 'expr-voice-5-m',
    speed: number = 1.0
): Promise<Blob | null> {
    try {
        const KITTEN_TTS_URL = 'http://localhost:5000';
        
        const response = await fetch(`${KITTEN_TTS_URL}/v1/audio/speech`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'kitten-tts',
                input: text,
                voice,
                speed,
                response_format: 'wav'
            })
        });

        if (!response.ok) {
            throw new Error(`TTS request failed with status ${response.status}`);
        }

        return await response.blob();
    } catch (error) {
        console.error('[Kitten-TTS] Error generating audio:', error);
        return null;
    }
}
```

## Conclusão

O Kitten-TTS-Server é uma excelente escolha para integrar com o RealTimeWav2Lip, oferecendo uma solução de síntese de fala leve, eficiente e de alta qualidade. Sua API simples e suporte a múltiplos formatos de áudio tornam a integração direta e eficaz.

Para obter o melhor desempenho, certifique-se de que ambos os serviços estejam rodando em hardware adequado e na mesma rede local para minimizar a latência.

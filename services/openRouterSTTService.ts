/**
 * OpenRouter Speech-to-Text Service
 * Uses Whisper Large-V3 Turbo via OpenRouter API
 */

const env = (import.meta as any).env as Record<string, string | undefined>;

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
// Using Voxtral (Mistral) as it is specifically designed for audio transcription
const WHISPER_MODEL_ID = 'mistralai/voxtral-small-24b-2507';

interface OpenRouterSTTResponse {
    choices: Array<{
        message: {
            content: string;
        };
    }>;
}

/**
 * Converts audio blob to base64
 */
async function audioBlobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64 = reader.result as string;
            // Remove data:audio/...;base64, prefix
            const base64Data = base64.split(',')[1];
            resolve(base64Data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

/**
 * Transcribe audio using OpenRouter Whisper Large-V3 Turbo
 * @param audioBlob - Audio data as Blob
 * @param language - Optional language hint (e.g., 'pt', 'en', 'auto')
 * @returns Transcribed text
 */
export async function transcribeWithOpenRouterWhisper(
    audioBlob: Blob,
    language: string = 'auto'
): Promise<string> {
    try {
        // Get API key from environment
        const apiKey = env.VITE_OPENROUTER_API_KEY;
        if (!apiKey) {
            throw new Error('VITE_OPENROUTER_API_KEY não encontrada no arquivo .env');
        }

        // Convert audio to base64
        const base64Audio = await audioBlobToBase64(audioBlob);

        // Prepare request payload
        const payload = {
            model: WHISPER_MODEL_ID,
            messages: [
                {
                    role: 'system',
                    content: 'You are a speech-to-text transcription service. Transcribe the user audio exactly as spoken. Do not translate, do not summarize, do not add commentary. Output ONLY the transcription.'
                },
                {
                    role: 'user',
                    content: [
                        {
                            type: 'input_audio',
                            input_audio: {
                                data: base64Audio,
                                format: 'wav'
                            }
                        },
                        {
                            type: 'text',
                            text: language === 'auto'
                                ? 'Transcribe this audio exactly.'
                                : `Transcribe this audio exactly in ${language}.`
                        }
                    ]
                }
            ]
        };

        // Make API request
        const response = await fetch(OPENROUTER_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': window.location.origin,
                'X-Title': 'LinguaFlow'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(
                `OpenRouter API error: ${response.status} - ${JSON.stringify(errorData)}`
            );
        }

        const data: OpenRouterSTTResponse = await response.json();

        if (!data.choices || data.choices.length === 0) {
            throw new Error('Resposta vazia do OpenRouter');
        }

        const transcription = data.choices[0].message.content;
        return transcription.trim();

    } catch (error) {
        console.error('OpenRouter Whisper STT error:', error);
        throw new Error(
            error instanceof Error
                ? `Erro na transcrição: ${error.message}`
                : 'Erro desconhecido na transcrição'
        );
    }
}

/**
 * Check if OpenRouter is properly configured
 */
export function isOpenRouterConfigured(): boolean {
    const apiKey = env.VITE_OPENROUTER_API_KEY;
    return !!apiKey && apiKey.length > 0;
}

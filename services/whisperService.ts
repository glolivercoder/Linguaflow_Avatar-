const PROXY_URL = import.meta.env.VITE_PROXY_URL || 'http://localhost:3001';

export interface WhisperTranscriptionResponse {
    transcription: string;
    language_detected: string;
    llm_response: string;
    audio_base64: string;
}

/**
 * Transcribe audio using Whisper STT service
 * @param audioBlob Audio blob to transcribe
 * @param language Language code ('auto', 'pt', 'en', 'es', 'ru', 'zh', 'ja', 'fr', 'de', 'it')
 * @returns Transcription response with detected language, LLM response, and TTS audio
 */
export async function transcribeWithWhisper(
    audioBase64: string,
    language: string = 'auto',
    modelId?: string
): Promise<WhisperTranscriptionResponse> {
    const response = await fetch(`${PROXY_URL}/whisper/chat/audio`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            audioBase64,
            language,
            ...(modelId && { modelId })
        })
    });

    if (!response.ok) {
        throw new Error(`Whisper service error: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Check Whisper service health
 */
export async function checkWhisperHealth(): Promise<{
    status: string;
    model: string;
    device: string;
    compute_type: string;
    model_loaded: boolean;
} | null> {
    try {
        const response = await fetch(`${PROXY_URL}/whisper/health`);
        if (response.ok) {
            return response.json();
        }
        return null;
    } catch (error) {
        console.error('Whisper health check failed:', error);
        return null;
    }
}

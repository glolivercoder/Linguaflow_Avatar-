/**
 * Wav2Lip Service Client
 * Handles communication with Wav2Lip backend for lip-sync video generation
 */

const PROXY_URL = window.location.hostname === 'localhost'
    ? 'http://localhost:8301'
    : `${window.location.protocol}//${window.location.hostname}:8301`;

export interface Wav2LipGenerateRequest {
    avatar_image: string;  // base64 encoded image
    audio: string;         // base64 encoded audio
    quality?: 'base' | 'gan';
}

export interface Wav2LipGenerateResponse {
    video: string;         // base64 encoded MP4
    duration_ms: number;
}

export interface Wav2LipHealthResponse {
    status: string;
    models: {
        'wav2lip.pth': boolean;
        'wav2lip_gan.pth': boolean;
        's3fd.pth': boolean;
    };
    all_models_ready: boolean;
    service_ready?: boolean;
}

/**
 * Check if Wav2Lip service is available and ready
 */
export async function checkWav2LipHealth(): Promise<Wav2LipHealthResponse | null> {
    try {
        const response = await fetch(`${PROXY_URL}/health`);
        if (!response.ok) {
            console.warn('[Wav2Lip] Health check failed:', response.status);
            return null;
        }
        return await response.json();
    } catch (error) {
        console.warn('[Wav2Lip] Service unavailable:', error);
        return null;
    }
}

/**
 * Generate lip-synced video from avatar image and audio
 * @param avatarImage - Base64 encoded image (JPG/PNG)
 * @param audioBlob - Audio blob (WAV/MP3)
 * @param quality - 'base' (faster, CPU-friendly) or 'gan' (better quality)
 * @returns Base64 encoded MP4 video or null if failed
 */
export async function generateLipSyncVideo(
    avatarImage: string,
    audioBlob: Blob,
    quality: 'base' | 'gan' = 'base'
): Promise<string | null> {
    try {
        console.log(`[Wav2Lip] Generating lip-sync video (quality=${quality})`);

        // Convert audio blob to base64
        const audioBase64 = await blobToBase64(audioBlob);

        // Remove data URL prefix from avatar if present
        const cleanAvatar = avatarImage.includes(',')
            ? avatarImage.split(',')[1]
            : avatarImage;

        // Create form-urlencoded body
        const body = new URLSearchParams();
        body.append('avatar_image', cleanAvatar);
        body.append('audio', audioBase64);
        body.append('quality', quality);

        const response = await fetch(`${PROXY_URL}/wav2lip/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: body.toString(),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            console.error('[Wav2Lip] Generation failed:', error);
            return null;
        }

        const data: Wav2LipGenerateResponse = await response.json();
        console.log(`[Wav2Lip] Video generated successfully (${data.duration_ms}ms)`);

        return data.video;
    } catch (error) {
        console.error('[Wav2Lip] Error generating video:', error);
        return null;
    }
}

/**
 * Generate audio from text using Pronunciation Service (Piper TTS)
 */
export async function generateTTSAudio(text: string): Promise<Blob | null> {
    try {
        // Use direct URL for now since it's on localhost, or use proxy if configured
        // Pronunciation service runs on port 8000
        const PRONUNCIATION_URL = 'http://localhost:8000';

        // 1. Generate audio file
        const formData = new FormData();
        formData.append('text', text);

        const genResponse = await fetch(`${PRONUNCIATION_URL}/generate-reference`, {
            method: 'POST',
            body: formData
        });

        if (!genResponse.ok) throw new Error('TTS generation failed');

        const genData = await genResponse.json();
        const audioUrl = `${PRONUNCIATION_URL}${genData.audio_url}`;

        // 2. Fetch audio blob
        const audioResponse = await fetch(audioUrl);
        if (!audioResponse.ok) throw new Error('Audio fetch failed');

        return await audioResponse.blob();
    } catch (error) {
        console.error('[Wav2Lip] TTS error:', error);
        return null;
    }
}


/**
 * Generate audio using Kitten-TTS Server
 * @param text - Text to convert to speech
 * @param voice - Voice model to use (default: from settings or 'expr-voice-5-m')
 * @param speed - Speech speed multiplier (default: from settings or 1.0)
 * @returns Audio blob or null if failed
 */
export async function generateWithKittenTTS(
    text: string,
    voice?: string,
    speed?: number
): Promise<Blob | null> {
    try {
        // Get settings from localStorage
        const settingsStr = localStorage.getItem('settings');
        const settings = settingsStr ? JSON.parse(settingsStr) : {};

        // Use provided values or fall back to settings or defaults
        const finalVoice = voice || settings.kittenVoice || 'expr-voice-5-m';
        const finalSpeed = speed || settings.kittenSpeed || 1.0;

        console.log(`[Kitten-TTS] Generating audio for text: "${text.substring(0, 50)}..." (voice: ${finalVoice}, speed: ${finalSpeed})`);

        // URL do servidor Kitten-TTS (porta 5000)
        const KITTEN_TTS_URL = 'http://localhost:5000';

        const response = await fetch(`${KITTEN_TTS_URL}/tts`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                text,
                voice: finalVoice,
                speed: finalSpeed,
                output_format: 'wav',  // WAV para melhor compatibilidade com Wav2Lip
                split_text: false
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[Kitten-TTS] Request failed with status ${response.status}:`, errorText);
            throw new Error(`TTS request failed with status ${response.status}`);
        }

        const audioBlob = await response.blob();
        console.log(`[Kitten-TTS] Audio generated successfully (${audioBlob.size} bytes)`);
        return audioBlob;
    } catch (error) {
        console.error('[Kitten-TTS] Error generating audio:', error);
        return null;
    }
}

/**
 * Generate audio using Kitten-TTS Server (OpenAI-compatible endpoint)
 * @param text - Text to convert to speech
 * @param voice - Voice model to use (default: 'expr-voice-5-m')
 * @param speed - Speech speed multiplier (default: 1.0, range: 0.8-1.2)
 * @returns Audio blob or null if failed
 */
export async function generateWithKittenTTSOpenAI(
    text: string,
    voice: string = 'expr-voice-5-m',
    speed: number = 1.0
): Promise<Blob | null> {
    try {
        console.log(`[Kitten-TTS OpenAI] Generating audio for text: "${text.substring(0, 50)}..."`);

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
            const errorText = await response.text();
            console.error(`[Kitten-TTS OpenAI] Request failed with status ${response.status}:`, errorText);
            throw new Error(`TTS request failed with status ${response.status}`);
        }

        const audioBlob = await response.blob();
        console.log(`[Kitten-TTS OpenAI] Audio generated successfully (${audioBlob.size} bytes)`);
        return audioBlob;
    } catch (error) {
        console.error('[Kitten-TTS OpenAI] Error generating audio:', error);
        return null;
    }
}


/**
 * Convert Blob to base64 string
 */
function blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64 = reader.result as string;
            // Remove data URL prefix (e.g., "data:audio/wav;base64,")
            const base64Data = base64.split(',')[1] || base64;
            resolve(base64Data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

/**
 * Convert base64 video to blob URL for <video> element
 */
export function base64ToVideoUrl(base64Video: string): string {
    const byteCharacters = atob(base64Video);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'video/mp4' });
    return URL.createObjectURL(blob);
}

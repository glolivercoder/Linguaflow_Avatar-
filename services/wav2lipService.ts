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

        const response = await fetch(`${PROXY_URL}/generate`, {
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

import { VoiceGender, LanguageCode } from '../types';
import { generateTTS as generateGeminiTTS } from './geminiService';

const env = (import.meta as any).env as Record<string, string | undefined>;
const PROXY_URL = env.VITE_PROXY_URL ?? 'http://localhost:3001';
const KITTEN_TTS_URL = 'http://localhost:5000';

/**
 * Unified TTS service with fallback logic:
 * 1. Try Kitten TTS first (English, fast and local)
 * 2. Use Piper for other languages
 * 3. Fall back to Gemini if both fail
 */

export interface TTSOptions {
    model?: 'kitten' | 'piper' | 'gemini';
    voice?: string;
    speed?: number;
    pitch?: number;
}

export async function generateSpeechWithFallback(
    text: string,
    language: LanguageCode,
    voiceGender: VoiceGender = 'female',
    options?: TTSOptions
): Promise<string | null> {
    console.log(`[UnifiedTTS] Generating speech for language: ${language}`, options);

    // 0. Explicit Model Selection
    if (options?.model) {
        if (options.model === 'kitten') {
            return await tryKittenTTS(text, voiceGender, options.voice, options.speed, options.pitch);
        } else if (options.model === 'piper') {
            return await tryPiperTTS(text, language, options.voice, options.speed);
        } else if (options.model === 'gemini') {
            return await generateGeminiTTS(text, language, voiceGender);
        }
    }

    // 1. Try Kitten TTS first for English
    if (language === 'en-US') {
        const kittenResult = await tryKittenTTS(text, voiceGender);
        if (kittenResult) {
            console.log('[UnifiedTTS] Using Kitten TTS');
            return kittenResult;
        }
        console.warn('[UnifiedTTS] Kitten TTS failed, trying Piper...');
    }

    // 2. Try Piper (for all languages, including English fallback)
    const piperResult = await tryPiperTTS(text, language);
    if (piperResult) {
        console.log('[UnifiedTTS] Using Piper TTS');
        return piperResult;
    }
    console.warn('[UnifiedTTS] Piper TTS failed, trying Gemini...');

    // 3. Fallback to Gemini
    console.log('[UnifiedTTS] Using Gemini TTS as fallback');
    return await generateGeminiTTS(text, language, voiceGender);
}

async function tryKittenTTS(text: string, voiceGender: VoiceGender, voice?: string, speed?: number, pitch?: number): Promise<string | null> {
    try {
        const selectedVoice = voice || (voiceGender === 'male' ? 'expr-voice-5-m' : 'expr-voice-5-f');

        const response = await fetch(`${KITTEN_TTS_URL}/tts`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                text,
                voice: selectedVoice,
                format: 'wav',
                speed: speed || 1.0,
                // Kitten TTS might not support pitch directly in this endpoint, checking server.py...
                // server.py only shows 'speed' in CustomTTSRequest. Pitch might be unsupported or named differently.
                // Assuming pitch is NOT supported for now to avoid errors, or passing it if supported.
                // Looking at server.py, CustomTTSRequest has: text, voice, format, speed, split_text, chunk_size. No pitch.
            }),
            signal: AbortSignal.timeout(30000),
        });

        if (!response.ok) {
            console.error(`[KittenTTS] HTTP error: ${response.status}`);
            return null;
        }

        const audioBlob = await response.blob();
        if (audioBlob.size < 100) {
            console.error(`[KittenTTS] Audio blob too small: ${audioBlob.size} bytes`);
            return null;
        }
        const arrayBuffer = await audioBlob.arrayBuffer();
        const base64 = btoa(
            new Uint8Array(arrayBuffer).reduce(
                (data, byte) => data + String.fromCharCode(byte),
                ''
            )
        );

        return base64;
    } catch (error) {
        console.error('[KittenTTS] Error:', error);
        return null;
    }
}

async function tryPiperTTS(text: string, language: LanguageCode, voice?: string, speed?: number): Promise<string | null> {
    try {
        // Map language codes to Piper models
        const languageMap: Record<string, string> = {
            'en-US': 'en_US',
            'pt-BR': 'pt_BR',
            'es-ES': 'es_ES',
            'fr-FR': 'fr_FR',
            'it-IT': 'it_IT',
            'ru-RU': 'ru_RU',
            'zh-CN': 'zh_CN',
            'ja-JP': 'ja_JP',
        };

        const piperLang = languageMap[language];
        if (!piperLang) {
            console.warn(`[PiperTTS] Unsupported language: ${language}`);
            return null;
        }

        const response = await fetch(`${PROXY_URL}/piper/tts`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                text,
                language: piperLang,
                // Piper proxy might support voice/speed if updated.
                // Assuming basic support for now.
            }),
            signal: AbortSignal.timeout(15000),
        });

        if (!response.ok) {
            console.error(`[PiperTTS] HTTP error: ${response.status}`);
            return null;
        }

        const audioBlob = await response.blob();
        const arrayBuffer = await audioBlob.arrayBuffer();
        const base64 = btoa(
            new Uint8Array(arrayBuffer).reduce(
                (data, byte) => data + String.fromCharCode(byte),
                ''
            )
        );

        return base64;
    } catch (error) {
        console.error('[PiperTTS] Error:', error);
        return null;
    }
}

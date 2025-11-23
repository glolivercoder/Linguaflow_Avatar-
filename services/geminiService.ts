import { VoiceGender, LanguageCode } from '../types';
import { VOICE_CONFIG } from '../constants';
import { proxyPost } from './proxyClient';

// Audio Decoding/Encoding Utilities
// FIX: Export the `decode` function so it can be imported and used in other files.
// FIX: Exported the 'decode' function to make it accessible to other modules.
export function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export function encode(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}


// --- API Functions ---

type TTSResponse = { audio: string | null };

export const generateTTS = async (text: string, lang: LanguageCode, gender: VoiceGender): Promise<string | null> => {
  try {
    const voiceConfig = VOICE_CONFIG[lang] ?? VOICE_CONFIG['en-US'];
    const preferredGender = voiceConfig[gender] ? gender : 'female';

    const { audio } = await proxyPost<TTSResponse>('/gemini/tts', {
      text,
      languageCode: lang,
      voiceGender: preferredGender,
    });

    return audio ?? null;
  } catch (error) {
    console.error('Error generating TTS via proxy:', error);
    return null;
  }
};


type PhoneticsResponse = { phonetics: string };

export const getPhonetics = async (text: string, targetLangName: string, nativeLangName: string): Promise<string> => {
  // Check cache first
  const cacheKey = `phonetic::${targetLangName}::${nativeLangName}::${text}`;
  try {
    const { getFromConversaCache, saveToConversaCache } = await import('./db');
    const cached = await getFromConversaCache(cacheKey);
    if (cached) {
      console.log('[Gemini] Phonetics cache hit:', { text, targetLangName, nativeLangName });
      return cached;
    }
  } catch (error) {
    console.warn('[Gemini] Cache check failed, proceeding with API:', error);
  }

  // Cache miss, call API
  try {
    const { phonetics } = await proxyPost<PhoneticsResponse>('/gemini/phonetics', {
      text,
      targetLangName,
      nativeLangName,
    });
    const result = phonetics ?? 'Não foi possível gerar a fonética.';

    // Save to cache
    try {
      const { saveToConversaCache } = await import('./db');
      await saveToConversaCache(cacheKey, result);
      console.log('[Gemini] Phonetics cached:', { text, targetLangName, nativeLangName });
    } catch (cacheError) {
      console.warn('[Gemini] Failed to cache phonetics:', cacheError);
    }

    return result;
  } catch (error) {
    console.error('Error generating phonetics via proxy:', error);
    return 'Não foi possível gerar a fonética.';
  }
};

type IPAResponse = { ipa: string };

export const getIPA = async (text: string, langName: string): Promise<string> => {
  try {
    const { ipa } = await proxyPost<IPAResponse>('/gemini/ipa', {
      text,
      langName,
    });
    return ipa ?? 'AFI indisponível';
  } catch (error) {
    console.error('Error fetching IPA via proxy:', error);
    return 'AFI indisponível';
  }
};

type TranslationResponse = { translation: string };

export const translateText = async (text: string, fromLangName: string, toLangName: string): Promise<string> => {
  // Check cache first
  const cacheKey = `translation::${fromLangName}::${toLangName}::${text}`;
  try {
    const { getFromConversaCache, saveToConversaCache } = await import('./db');
    const cached = await getFromConversaCache(cacheKey);
    if (cached) {
      console.log('[Gemini] Translation cache hit:', { text, fromLangName, toLangName });
      return cached;
    }
  } catch (error) {
    console.warn('[Gemini] Cache check failed, proceeding with API:', error);
  }

  // Cache miss, call API  
  try {
    const { translation } = await proxyPost<TranslationResponse>('/gemini/translate', {
      text,
      fromLangName,
      toLangName,
    });
    const result = translation ?? 'Erro na tradução.';

    // Save to cache
    try {
      const { saveToConversaCache } = await import('./db');
      await saveToConversaCache(cacheKey, result);
      console.log('[Gemini] Translation cached:', { text, fromLangName, toLangName });
    } catch (cacheError) {
      console.warn('[Gemini] Failed to cache translation:', cacheError);
    }

    return result;
  } catch (error) {
    console.error('Error translating text via proxy:', error);
    return 'Erro na tradução.';
  }
};


type PronunciationFeedbackResponse = { feedback: string };

export const getPronunciationCorrection = async (
  phraseToPractice: string,
  userTranscription: string,
  learningLangName: string,
  nativeLangName: string,
): Promise<string> => {
  try {
    const { feedback } = await proxyPost<PronunciationFeedbackResponse>('/gemini/pronunciation-feedback', {
      phraseToPractice,
      userTranscription,
      learningLangName,
      nativeLangName,
    });
    return feedback ?? 'Desculpe, não consegui analisar sua pronúncia. Tente novamente.';
  } catch (error) {
    console.error('Error getting pronunciation correction via proxy:', error);
    return 'Desculpe, não consegui analisar sua pronúncia. Tente novamente.';
  }
};

type GroundedAnswerResponse = { text: string; sources: any[] };

export const getGroundedAnswer = async (query: string): Promise<{ text: string; sources: any[] }> => {
  try {
    const { text, sources } = await proxyPost<GroundedAnswerResponse>('/gemini/grounded-answer', { query });
    return {
      text: text ?? 'Desculpe, não consegui encontrar uma resposta.',
      sources: sources ?? [],
    };
  } catch (error) {
    console.error('Error with grounded search via proxy:', error);
    return { text: 'Desculpe, não consegui encontrar uma resposta.', sources: [] };
  }
};
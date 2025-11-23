// services/voskService.ts
import { PROXY_BASE_URL } from './proxyClient';
import { OpenRouterModelSummary } from '../types';

export interface OpenRouterModelsResult {
  models: OpenRouterModelSummary[];
  providers: string[];
}

export interface VoskResponse {
  transcription: string;
  llm_response?: string;
  audio_base64?: string;
}

export interface VoskRequest {
  model: string;
  audioBase64: string;
  systemPrompt: string;
  language: string;
}

/**
 * Sends audio data to the Vosk service for transcription and processing
 */
export async function chatWithAudio({
  model,
  audioBase64,
  systemPrompt,
  language = 'pt-BR'
}: {
  model: string;
  audioBase64: string;
  systemPrompt: string;
  language?: string;
}): Promise<VoskResponse> {
  try {
    const response = await fetch(`${PROXY_BASE_URL}/vosk/chat/audio`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        audio_base64: audioBase64,
        system_prompt: systemPrompt,
        language,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.detail || `Error ${response.status}: ${response.statusText}` 
      );
    }

    return await response.json();
  } catch (error) {
    console.error('Error in chatWithAudio:', error);
    throw error;
  }
}

/**
 * Encodes Int16Array audio data to base64 WAV format
 */
export function encodeInt16ToWavBase64(
  int16Data: Int16Array,
  sampleRate = 16000
): string {
  const numChannels = 1;
  const bitsPerSample = 16;
  const bytesPerSample = bitsPerSample / 8;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataLength = int16Data.length * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataLength);
  const view = new DataView(buffer);

  let offset = 0;
  const writeString = (text: string) => {
    for (let i = 0; i < text.length; i++) {
      view.setUint8(offset + i, text.charCodeAt(i));
    }
    offset += text.length;
  };

  // RIFF header
  writeString('RIFF');
  view.setUint32(offset, 36 + dataLength, true);
  offset += 4;
  writeString('WAVE');

  // fmt subchunk
  writeString('fmt ');
  view.setUint32(offset, 16, true); // Subchunk1Size for PCM
  offset += 4;
  view.setUint16(offset, 1, true);  // AudioFormat PCM
  offset += 2;
  view.setUint16(offset, numChannels, true);
  offset += 2;
  view.setUint32(offset, sampleRate, true);
  offset += 4;
  view.setUint32(offset, byteRate, true);
  offset += 4;
  view.setUint16(offset, blockAlign, true);
  offset += 2;
  view.setUint16(offset, bitsPerSample, true);
  offset += 2;

  // data subchunk
  writeString('data');
  view.setUint32(offset, dataLength, true);
  offset += 4;

  // Write audio data
  for (let i = 0; i < int16Data.length; i++, offset += 2) {
    view.setInt16(offset, int16Data[i], true);
  }

  // Convert to base64
  const wavBytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < wavBytes.byteLength; i++) {
    binary += String.fromCharCode(wavBytes[i]);
  }

  return btoa(binary);
}

/**
 * Checks if audio is silent based on RMS value
 */
export function isAudioSilent(samples: Int16Array, threshold = 0.002): boolean {
  if (samples.length === 0) return true;
  
  let sumSquares = 0;
  for (let i = 0; i < samples.length; i++) {
    const normalized = samples[i] / 32768; // Normalize to [-1, 1]
    sumSquares += normalized * normalized;
  }
  
  const rms = Math.sqrt(sumSquares / samples.length);
  return rms < threshold;
}

/**
 * Merges multiple Int16Array chunks into one
 */
export function mergeInt16Chunks(chunks: Int16Array[]): Int16Array {
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const result = new Int16Array(totalLength);
  let offset = 0;
  
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  
  return result;
}

export default {
  chatWithAudio,
  encodeInt16ToWavBase64,
  isAudioSilent,
  mergeInt16Chunks,
};

/**
 * Fetches available models from OpenRouter API
 */
const parsePriceToNumber = (value: unknown): number | null => {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === 'string') {
    const cleaned = value.replace(/[^0-9.\-]/g, '');
    if (!cleaned) {
      return null;
    }
    const parsed = Number.parseFloat(cleaned);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const determineIsFree = (pricing: Record<string, unknown> | null | undefined): boolean => {
  if (!pricing) {
    return false;
  }
  const keys: Array<'prompt' | 'completion' | 'request'> = ['prompt', 'completion', 'request'];
  const values = keys
    .map((key) => parsePriceToNumber((pricing as any)[key]))
    .filter((value): value is number => value !== null);

  if (values.length === 0) {
    return false;
  }

  return values.every((value) => value === 0);
};

const extractProvider = (model: any): string => {
  if (typeof model.provider === 'string' && model.provider.trim()) {
    return model.provider.trim();
  }
  if (typeof model.id === 'string' && model.id.includes('/')) {
    return model.id.split('/')[0];
  }
  return 'desconhecido';
};

export async function fetchOpenRouterModels({
  search,
  includeFree,
  includePaid,
  provider,
}: {
  search: string;
  includeFree: boolean;
  includePaid: boolean;
  provider?: string;
}): Promise<OpenRouterModelsResult> {
  try {
    const response = await fetch(`${PROXY_BASE_URL}/openrouter/models`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error?.message || `Error ${response.status}: ${response.statusText}`
      );
    }

    const data = await response.json();

    const mapped = (data.data || []).map((model: any) => {
      const providerName = extractProvider(model);
      const pricing = model.pricing || null;
      const isFree = determineIsFree(pricing);

      return {
        id: model.id,
        name: model.name,
        description: model.description || '',
        context_length: model.context_length || 0,
        pricing,
        tags: model.tags || null,
        provider: providerName,
        isFree,
      } as OpenRouterModelSummary;
    });

    const providerSet = new Set<string>();
    mapped.forEach((model) => {
      if (model.provider) {
        providerSet.add(model.provider);
      }
    });

    const availableProviders = Array.from(providerSet).sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: 'base' })
    );

    const normalizedSearch = (search || '').toLowerCase();
    const normalizedProvider = provider?.toLowerCase();

    const filtered = mapped.filter((m) => {
      const searchMatch =
        !normalizedSearch ||
        m.name?.toLowerCase().includes(normalizedSearch) ||
        m.id.toLowerCase().includes(normalizedSearch) ||
        m.description?.toLowerCase().includes(normalizedSearch) ||
        m.tags?.some((tag) => tag.toLowerCase().includes(normalizedSearch));

      const providerMatch =
        !normalizedProvider ||
        normalizedProvider === 'all' ||
        m.provider?.toLowerCase() === normalizedProvider;

      const priceMatch = m.isFree ? includeFree : includePaid;

      return searchMatch && providerMatch && priceMatch;
    });

    return {
      models: filtered,
      providers: availableProviders,
    };
  } catch (error) {
    console.error('Error fetching OpenRouter models:', error);
    throw error;
  }
}

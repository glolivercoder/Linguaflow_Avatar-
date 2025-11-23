
import { Language, Settings } from './types';

// Vosk STT service URL (usado apenas pelo proxy)
export const VOSK_SERVICE_URL = process.env.VITE_VOSK_SERVICE_URL || 'http://localhost:8200';


export const SUPPORTED_LANGUAGES: Language[] = [
  { code: 'pt-BR', name: 'Português (BR)' },
  { code: 'en-US', name: 'Inglês (EUA)' },
  { code: 'es-ES', name: 'Espanhol' },
  { code: 'zh-CN', name: 'Chinês' },
  { code: 'ja-JP', name: 'Japonês' },
  { code: 'ru-RU', name: 'Russo' },
  { code: 'fr-FR', name: 'Francês' },
  { code: 'it-IT', name: 'Italiano' },
  { code: 'eo', name: 'Esperanto' },
];

export const VOICE_CONFIG: { [key: string]: { male: string; female: string; neutral: string } } = {
    'en-US': { male: 'Fenrir', female: 'Kore', neutral: 'Puck' },
    'es-ES': { male: 'Fenrir', female: 'Kore', neutral: 'Puck' },
    'pt-BR': { male: 'Fenrir', female: 'Kore', neutral: 'Puck' },
    'zh-CN': { male: 'Fenrir', female: 'Kore', neutral: 'Puck' },
    'ja-JP': { male: 'Fenrir', female: 'Kore', neutral: 'Puck' },
    'ru-RU': { male: 'Fenrir', female: 'Kore', neutral: 'Puck' },
    'fr-FR': { male: 'Fenrir', female: 'Kore', neutral: 'Puck' },
    'it-IT': { male: 'Fenrir', female: 'Kore', neutral: 'Puck' },
    'eo': { male: 'Fenrir', female: 'Kore', neutral: 'Puck' },
};

export const DEFAULT_SETTINGS: Settings = {
  nativeLanguage: 'pt-BR',
  learningLanguage: 'en-US',
  voiceGender: 'female',
  piperVoiceModel: 'en_US-lessac-medium',
  preferOfflineTranslation: false,
  useVoskStt: false,
  openRouterModelId: 'openrouter/auto',
  openRouterIncludeFree: true,
  openRouterIncludePaid: true,
};
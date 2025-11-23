

export type LanguageCode = 'en-US' | 'es-ES' | 'pt-BR' | 'zh-CN' | 'ja-JP' | 'ru-RU' | 'fr-FR' | 'it-IT' | 'eo';

export interface Language {
  code: LanguageCode;
  name: string;
}

export type VoiceGender = 'male' | 'female' | 'neutral';

export type FlashcardSourceType = 'manual' | 'anki';

export interface Flashcard {
  id: string;
  originalText: string;
  translatedText: string;
  phoneticText: string;
  originalLang: LanguageCode;
  translatedLang: LanguageCode;
  imageUrl?: string;
  sourceType?: FlashcardSourceType;
  ankiDeckId?: string;
  ankiDeckName?: string;
  ankiNoteId?: number;
}

export interface Settings {
  nativeLanguage: LanguageCode;
  learningLanguage: LanguageCode;
  voiceGender: VoiceGender;
  piperVoiceModel?: string;
  preferOfflineTranslation?: boolean;
  useVoskStt?: boolean;
  openRouterModelId?: string;
  openRouterIncludeFree?: boolean;
  openRouterIncludePaid?: boolean;
  phoneticFormat?: PhoneticFormat;
}

export type View = 'conversation' | 'flashcards' | 'settings' | 'anki' | 'smartLearn' | 'licoes';


// --- New types for Predefined Flashcard Data ---

export type MultilingualText = Partial<Record<LanguageCode, string>>;

export interface VoiceModelInfo {
  key: string;
  language: string;
  quality?: string | null;
  file_path: string;
}

export interface RawCard {
    id: string;
    texts: MultilingualText;
    phoneticTexts?: MultilingualText;
    imageUrl?: string;
}

export interface RawCategory {
    [categoryName: string]: RawCard[];
}

// FIX: Corrected typo 'Raw-Category' to 'RawCategory'. A hyphen is not allowed in a type name and was causing parsing errors.
export interface RawFlashcardData {
    phrases: RawCategory;
    objects: RawCategory;
}

export interface OpenRouterModelSummary {
    id: string;
    name?: string;
    description?: string;
    context_length?: number;
    pricing?: Record<string, unknown> | null;
    tags?: string[] | null;
    provider?: string;
    isFree?: boolean;
}

export type PhoneticFormat = 'simplified' | 'ipa';

// --- Types for Anki Importer ---
export interface AnkiCard {
    id: number;
    front: string;
    back: string;
    image?: string;
    audio?: string;
    tags: string[];
    deckId?: string;
    deckName?: string;
}

export interface AnkiDeckSummary {
    id: string;
    name: string;
    cardCount: number;
    importedAt: number;
}

export interface ConversionConfig {
    nativeLanguage: LanguageCode;
    learningLanguage: LanguageCode;
    usePixabayForImages: boolean;
    enableOCR: boolean;
    generatePhonetics: boolean;
}

export interface CustomCategory {
  id: string;
  type: 'phrases' | 'objects';
  name: string;
  cards: RawCard[];
  createdAt: string;
  updatedAt: string;
}

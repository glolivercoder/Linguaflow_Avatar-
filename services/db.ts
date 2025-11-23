import Dexie, { type Table } from 'dexie';
import { Settings, Flashcard, AnkiDeckSummary, LanguageCode, RawCard } from '../types';
import { DEFAULT_SETTINGS } from '../constants';
import type { TranslatedCategories } from '../data/conversationCategories';

export interface PhoneticCache {
  cardId: string;
  phonetic: string;
}

export interface ImageOverride {
  cardId: string;
  imageUrl: string;
}

interface SettingsRecord extends Settings {
  id: number;
}

interface AnkiDeckRecord extends AnkiDeckSummary { }

export interface CategoryTranslationRecord {
  language: LanguageCode;
  categories: TranslatedCategories;
  updatedAt: string;
}

const db = new Dexie('linguaFlowDB');

db.version(2).stores({
  settings: 'id',
  flashcards: 'id',
  phonetics: 'cardId',
  imageOverrides: 'cardId',
});

db.version(3).stores({
  settings: 'id',
  flashcards: 'id, sourceType, ankiDeckId',
  phonetics: 'cardId',
  imageOverrides: 'cardId',
  ankiDecks: 'id',
}).upgrade(async tx => {
  const flashcardsTable = tx.table('flashcards');
  await flashcardsTable.toCollection().modify((card: any) => {
    if (!card.sourceType) {
      card.sourceType = typeof card.id === 'string' && card.id.startsWith('anki-') ? 'anki' : 'manual';
    }
  });
});

db.version(4).stores({
  settings: 'id',
  flashcards: 'id, sourceType, ankiDeckId',
  phonetics: 'cardId',
  imageOverrides: 'cardId',
  ankiDecks: 'id, importedAt',
}).upgrade(async tx => {
  const ankiDecksTable = tx.table('ankiDecks');
  await ankiDecksTable.toCollection().modify((deck: any) => {
    if (!deck.importedAt) {
      deck.importedAt = new Date().toISOString();
    }
  });
});

db.version(5).stores({
  settings: 'id',
  flashcards: 'id, sourceType, ankiDeckId',
  phonetics: 'cardId',
  imageOverrides: 'cardId',
  ankiDecks: 'id, importedAt',
  categoryTranslations: 'language',
});

db.version(6).stores({
  settings: 'id',
  flashcards: 'id, sourceType, ankiDeckId',
  phonetics: 'cardId',
  imageOverrides: 'cardId',
  ankiDecks: 'id, importedAt',
  categoryTranslations: 'language',
  categoryPhonetics: 'key',
});

// Version 7: Add image cache for local storage
export interface ImageCacheRecord {
  cardId: string;
  imageBlob: Blob;
  originalUrl: string;
  cachedAt: number;
}

db.version(7).stores({
  settings: 'id',
  flashcards: 'id, sourceType, ankiDeckId',
  phonetics: 'cardId',
  imageOverrides: 'cardId',
  ankiDecks: 'id, importedAt',
  categoryTranslations: 'language',
  categoryPhonetics: 'key',
  imageCache: 'cardId, cachedAt',
});

// Version 8: Add conversaCache for Conversa sidebar translations and phonetics
export interface ConversaCacheRecord {
  cacheKey: string;      // Unique key: "targetLang::text" for translations, "phonetic::text" for phonetics
  cachedValue: string;   // The translated text or phonetic transcription
  cachedAt: number;      // Timestamp
}

db.version(8).stores({
  settings: 'id',
  flashcards: 'id, sourceType, ankiDeckId',
  phonetics: 'cardId',
  imageOverrides: 'cardId',
  ankiDecks: 'id, importedAt',
  categoryTranslations: 'language',
  categoryPhonetics: 'key',
  imageCache: 'cardId, cachedAt',
  conversaCache: 'cacheKey, cachedAt',
});

// Version 9: Add customCategories for user-created flashcard categories
export interface CustomCategory {
  id: string;
  type: 'phrases' | 'objects';
  name: string;
  cards: RawCard[];
  createdAt: string;
  updatedAt: string;
}

db.version(9).stores({
  settings: 'id',
  flashcards: 'id, sourceType, ankiDeckId',
  phonetics: 'cardId',
  imageOverrides: 'cardId',
  ankiDecks: 'id, importedAt',
  categoryTranslations: 'language',
  categoryPhonetics: 'key',
  imageCache: 'cardId, cachedAt',
  conversaCache: 'cacheKey, cachedAt',
  customCategories: 'id, type, name, createdAt',
});

// Version 10: Add pixabaySearchCache for persistent Pixabay search results
export interface PixabaySearchCacheRecord {
  query: string;        // Normalized search query (lowercase, trimmed) - PRIMARY KEY
  urls: string[];       // Array of image URLs returned from Pixabay
  cachedAt: number;     // Timestamp when cached
}

db.version(10).stores({
  settings: 'id',
  flashcards: 'id, sourceType, ankiDeckId',
  phonetics: 'cardId',
  imageOverrides: 'cardId',
  ankiDecks: 'id, importedAt',
  categoryTranslations: 'language',
  categoryPhonetics: 'key',
  imageCache: 'cardId, cachedAt',
  conversaCache: 'cacheKey, cachedAt',
  customCategories: 'id, type, name, createdAt',
  pixabaySearchCache: 'query, cachedAt',
});

const settingsTable: Table<SettingsRecord, number> = db.table('settings');
const flashcardsTable: Table<Flashcard, string> = db.table('flashcards');
const phoneticsTable: Table<PhoneticCache, string> = db.table('phonetics');
const imageOverridesTable: Table<ImageOverride, string> = db.table('imageOverrides');
const ankiDecksTable: Table<AnkiDeckRecord, string> = db.table('ankiDecks');
const categoryTranslationsTable: Table<CategoryTranslationRecord, LanguageCode> = db.table('categoryTranslations');
export interface CategoryPhoneticRecord {
  key: string; // `${targetLang}|${nativeLang}|${text}`
  phonetic: string;
  targetLanguage: LanguageCode;
  nativeLanguage: LanguageCode;
  updatedAt: string;
}
const categoryPhoneticsTable: Table<CategoryPhoneticRecord, string> = db.table('categoryPhonetics');
const imageCacheTable: Table<ImageCacheRecord, string> = db.table('imageCache');
const customCategoriesTable: Table<CustomCategory, string> = db.table('customCategories');

// Version 8: Add conversaCache table reference
export interface ConversaCacheRecord {
  cacheKey: string;      // Unique key: "targetLang::text" for translations, "phonetic::text" for phonetics
  cachedValue: string;   // The translated text or phonetic transcription
  cachedAt: number;      // Timestamp
}
const conversaCacheTable: Table<ConversaCacheRecord, string> = db.table('conversaCache');

// Version 10: Add pixabaySearchCache table reference
const pixabaySearchCacheTable: Table<PixabaySearchCacheRecord, string> = db.table('pixabaySearchCache');


// --- Settings ---
export const getSettings = async (): Promise<Settings> => {
  const settingsRecord = await settingsTable.get(1);

  const cleanedRecord: Partial<Settings> = {};
  if (settingsRecord) {
    for (const key in DEFAULT_SETTINGS) {
      const recordKey = key as keyof Settings;
      if (
        Object.prototype.hasOwnProperty.call(settingsRecord, recordKey) &&
        settingsRecord[recordKey] !== null &&
        settingsRecord[recordKey] !== undefined
      ) {
        (cleanedRecord as any)[recordKey] = settingsRecord[recordKey];
      }
    }
  }

  const finalSettings = { ...DEFAULT_SETTINGS, ...cleanedRecord };

  // The record in the DB has an `id`, but the Settings type doesn't.
  // We remove it before returning to match the type.
  const { id, ...settingsToReturn } = finalSettings as SettingsRecord;

  return settingsToReturn;
};

export const saveSettings = async (settings: Settings): Promise<void> => {
  await settingsTable.put({ ...settings, id: 1 });
};

// --- Flashcards ---
export const getFlashcards = (): Promise<Flashcard[]> => {
  return flashcardsTable.toArray();
};

export const addFlashcard = async (card: Flashcard): Promise<void> => {
  await flashcardsTable.add(card);
};

export const bulkAddFlashcards = async (cards: Flashcard[]): Promise<void> => {
  await flashcardsTable.bulkAdd(cards);
};

export const updateFlashcardImage = async (cardId: string, imageUrl: string): Promise<void> => {
  await flashcardsTable.update(cardId, { imageUrl });
};

export const deleteFlashcards = async (cardIds: string[]): Promise<void> => {
  if (!cardIds.length) return;
  await flashcardsTable.bulkDelete(cardIds);
};

// --- Phonetics Cache ---
export const cachePhonetic = async (cardId: string, phonetic: string): Promise<void> => {
  await phoneticsTable.put({ cardId, phonetic });
};

export const getPhonetic = async (cardId: string): Promise<string | null> => {
  const cached = await phoneticsTable.get(cardId);
  return cached?.phonetic || null;
};

export const getAllPhonetics = (): Promise<PhoneticCache[]> => {
  return phoneticsTable.toArray();
}

// --- Image Overrides ---
export const saveImageOverride = async (cardId: string, imageUrl: string): Promise<void> => {
  await imageOverridesTable.put({ cardId, imageUrl });
};

export const getAllImageOverrides = (): Promise<ImageOverride[]> => {
  return imageOverridesTable.toArray();
};

// --- Anki Decks ---
export const getAnkiDeckSummaries = (): Promise<AnkiDeckSummary[]> => {
  return ankiDecksTable.orderBy('importedAt').reverse().toArray();
};

export const upsertAnkiDeckSummary = async (summary: AnkiDeckSummary): Promise<void> => {
  await ankiDecksTable.put(summary);
};

export const deleteAnkiDeck = async (deckId: string): Promise<void> => {
  await db.transaction('rw', flashcardsTable, phoneticsTable, imageOverridesTable, ankiDecksTable, async () => {
    const flashcardIds = await flashcardsTable.where('ankiDeckId').equals(deckId).primaryKeys() as string[];
    if (flashcardIds.length) {
      await flashcardsTable.where('ankiDeckId').equals(deckId).delete();
      await phoneticsTable.bulkDelete(flashcardIds);
      await imageOverridesTable.bulkDelete(flashcardIds);
    }
    await ankiDecksTable.delete(deckId);
  });
};

export const replaceAnkiDeckSummaries = async (summaries: AnkiDeckSummary[]): Promise<void> => {
  await db.transaction('rw', ankiDecksTable, async () => {
    await ankiDecksTable.clear();
    if (summaries.length) {
      await ankiDecksTable.bulkAdd(summaries);
    }
  });
};

// --- Category Translations ---
export const getCategoryTranslations = async (
  language: LanguageCode
): Promise<TranslatedCategories | null> => {
  const record = await categoryTranslationsTable.get(language);
  return record?.categories ?? null;
};

export const saveCategoryTranslations = async (
  language: LanguageCode,
  categories: TranslatedCategories
): Promise<void> => {
  await categoryTranslationsTable.put({
    language,
    categories,
    updatedAt: new Date().toISOString(),
  });
  // Trigger auto-backup when translations are cached
  import('./autoBackupService').then(({ triggerBackupOnTranslationCache }) => {
    triggerBackupOnTranslationCache();
  }).catch(() => {/* ignore */ });
};

export const getAllCategoryTranslationRecords = async (): Promise<CategoryTranslationRecord[]> => {
  return categoryTranslationsTable.toArray();
};

// --- Category Phonetics ---
const makePhoneticKey = (target: LanguageCode, native: LanguageCode, text: string): string => {
  return `${target}|${native}|${text}`;
};

export const saveCategoryPhonetic = async (
  target: LanguageCode,
  native: LanguageCode,
  text: string,
  phonetic: string,
): Promise<void> => {
  const key = makePhoneticKey(target, native, text);
  await categoryPhoneticsTable.put({
    key,
    phonetic,
    targetLanguage: target,
    nativeLanguage: native,
    updatedAt: new Date().toISOString(),
  });
  // Trigger auto-backup when phonetics are cached
  import('./autoBackupService').then(({ triggerBackupOnTranslationCache }) => {
    triggerBackupOnTranslationCache();
  }).catch(() => {/* ignore */ });
};

export const getCategoryPhonetic = async (
  target: LanguageCode,
  native: LanguageCode,
  text: string,
): Promise<string | null> => {
  const key = makePhoneticKey(target, native, text);
  const rec = await categoryPhoneticsTable.get(key);
  return rec?.phonetic ?? null;
};

export const getAllCategoryPhonetics = async (): Promise<CategoryPhoneticRecord[]> => {
  return categoryPhoneticsTable.toArray();
};

export interface DatabaseSnapshot {
  settings: Settings;
  flashcards: Flashcard[];
  phonetics: PhoneticCache[];
  imageOverrides: ImageOverride[];
  ankiDecks: AnkiDeckSummary[];
  categoryTranslations: CategoryTranslationRecord[];
  categoryPhonetics: CategoryPhoneticRecord[];
}

export const exportDatabaseSnapshot = async (): Promise<DatabaseSnapshot> => {
  const [settings, flashcards, phonetics, imageOverrides, ankiDecks, categoryTranslations] = await Promise.all([
    getSettings(),
    getFlashcards(),
    getAllPhonetics(),
    getAllImageOverrides(),
    getAnkiDeckSummaries(),
    getAllCategoryTranslationRecords(),
  ]);
  const categoryPhonetics = await getAllCategoryPhonetics();

  return {
    settings,
    flashcards,
    phonetics,
    imageOverrides,
    ankiDecks,
    categoryTranslations,
    categoryPhonetics,
  };
};

export const importDatabaseSnapshot = async (snapshot: DatabaseSnapshot): Promise<void> => {
  await db.transaction(
    'rw',
    [
      settingsTable,
      flashcardsTable,
      phoneticsTable,
      imageOverridesTable,
      ankiDecksTable,
      categoryTranslationsTable,
    ],
    async () => {
      await Promise.all([
        settingsTable.clear(),
        flashcardsTable.clear(),
        phoneticsTable.clear(),
        imageOverridesTable.clear(),
        ankiDecksTable.clear(),
        categoryTranslationsTable.clear(),
      ]);

      const sanitizedSettings = snapshot.settings ?? DEFAULT_SETTINGS;
      await settingsTable.put({ ...DEFAULT_SETTINGS, ...sanitizedSettings, id: 1 });

      if (snapshot.flashcards?.length) {
        await flashcardsTable.bulkPut(snapshot.flashcards);
      }

      if (snapshot.phonetics?.length) {
        await phoneticsTable.bulkPut(snapshot.phonetics);
      }

      if (snapshot.imageOverrides?.length) {
        await imageOverridesTable.bulkPut(snapshot.imageOverrides);
      }

      if (snapshot.ankiDecks?.length) {
        await ankiDecksTable.bulkPut(snapshot.ankiDecks);
      }

      if (snapshot.categoryTranslations?.length) {
        await categoryTranslationsTable.bulkPut(snapshot.categoryTranslations);
      }

      if (snapshot.categoryPhonetics?.length) {
        await categoryPhoneticsTable.bulkPut(snapshot.categoryPhonetics);
      }
    }
  )
};

// --- Image Cache ---
export const saveImageToCache = async (
  cardId: string,
  imageBlob: Blob,
  originalUrl: string
): Promise<void> => {
  await imageCacheTable.put({
    cardId,
    imageBlob,
    originalUrl,
    cachedAt: Date.now(),
  });
};

export const getImageFromCache = async (cardId: string): Promise<string | null> => {
  const cached = await imageCacheTable.get(cardId);
  if (!cached) return null;

  // Convert blob to object URL
  return URL.createObjectURL(cached.imageBlob);
};

export const isImageCached = async (cardId: string): Promise<boolean> => {
  const cached = await imageCacheTable.get(cardId);
  return !!cached;
};

export const clearImageCache = async (): Promise<void> => {
  await imageCacheTable.clear();
};

export const deleteImageFromCache = async (cardId: string): Promise<void> => {
  await imageCacheTable.delete(cardId);
};

export const getAllCachedImages = async (): Promise<ImageCacheRecord[]> => {
  return imageCacheTable.toArray();
};

// --- ConversaCache (Translations and Phonetics from Conversa View) ---
export const saveToConversaCache = async (cacheKey: string, cachedValue: string): Promise<void> => {
  await conversaCacheTable.put({
    cacheKey,
    cachedValue,
    cachedAt: Date.now(),
  });
};

export const getFromConversaCache = async (cacheKey: string): Promise<string | null> => {
  const cached = await conversaCacheTable.get(cacheKey);
  return cached ? cached.cachedValue : null;
};

export const clearConversaCache = async (): Promise<void> => {
  await conversaCacheTable.clear();
};

export const getConversaCacheStats = async (): Promise<{ count: number; size: number }> => {
  const allRecords = await conversaCacheTable.toArray();
  const size = allRecords.reduce((acc, record) => acc + record.cachedValue.length, 0);
  return { count: allRecords.length, size };
};

export const getAllConversaCache = async (): Promise<ConversaCacheRecord[]> => {
  return conversaCacheTable.toArray();
};

export const getCustomCategoryByName = async (
  type: 'phrases' | 'objects',
  name: string
): Promise<CustomCategory | undefined> => {
  const list = await customCategoriesTable.where('type').equals(type).toArray();
  return list.find(c => c.name === name);
};

export const appendCardsToCustomCategory = async (
  type: 'phrases' | 'objects',
  name: string,
  cards: RawCard[],
): Promise<void> => {
  const existing = await getCustomCategoryByName(type, name);
  if (!existing) {
    const category: CustomCategory = {
      id: `custom-cat-${Date.now()}`,
      type,
      name,
      cards,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await customCategoriesTable.put(category);
    return;
  }
  const merged = { ...existing, cards: [...existing.cards, ...cards], updatedAt: new Date().toISOString() };
  await customCategoriesTable.put(merged);
};

export const getAllCustomCategories = async (): Promise<CustomCategory[]> => {
  return customCategoriesTable.toArray();
};

export const deleteCustomCategory = async (id: string): Promise<void> => {
  await customCategoriesTable.delete(id);
};

export const updateCustomCategory = async (category: CustomCategory): Promise<void> => {
  await customCategoriesTable.put({ ...category, updatedAt: new Date().toISOString() });
};

export const getCustomCategories = async (type: 'phrases' | 'objects'): Promise<CustomCategory[]> => {
  return customCategoriesTable.where('type').equals(type).toArray();
};

export const saveCustomCategory = async (category: CustomCategory): Promise<void> => {
  await customCategoriesTable.put({ ...category, updatedAt: new Date().toISOString() });
};

// --- Pixabay Search Cache ---
const PIXABAY_CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

export const savePixabaySearch = async (query: string, urls: string[]): Promise<void> => {
  const normalized = query.trim().toLowerCase();
  await pixabaySearchCacheTable.put({
    query: normalized,
    urls,
    cachedAt: Date.now(),
  });
};

export const getPixabaySearch = async (query: string): Promise<string[] | null> => {
  const normalized = query.trim().toLowerCase();
  const cached = await pixabaySearchCacheTable.get(normalized);

  if (!cached) return null;

  // Check if cache is expired (older than 24h)
  const age = Date.now() - cached.cachedAt;
  if (age > PIXABAY_CACHE_DURATION_MS) {
    // Remove expired cache
    await pixabaySearchCacheTable.delete(normalized);
    return null;
  }

  return cached.urls;
};

export const getAllPixabaySearches = async (): Promise<PixabaySearchCacheRecord[]> => {
  return pixabaySearchCacheTable.toArray();
};

export const clearOldPixabayCache = async (olderThanMs: number = PIXABAY_CACHE_DURATION_MS): Promise<number> => {
  const now = Date.now();
  const allRecords = await pixabaySearchCacheTable.toArray();
  const oldKeys: string[] = [];

  allRecords.forEach(record => {
    if (now - record.cachedAt > olderThanMs) {
      oldKeys.push(record.query);
    }
  });

  if (oldKeys.length > 0) {
    await pixabaySearchCacheTable.bulkDelete(oldKeys);
  }

  return oldKeys.length;
};

// --- Cache Statistics ---
export interface CacheStats {
  pixabaySearches: number;
  translations: number;
  phonetics: number;
  imageCache: number;
  conversaCache: number;
}

export const getCacheStats = async (): Promise<CacheStats> => {
  const [pixabaySearches, translations, phonetics, imageCache, conversaCache] = await Promise.all([
    pixabaySearchCacheTable.count(),
    categoryTranslationsTable.count(),
    categoryPhoneticsTable.count(),
    imageCacheTable.count(),
    conversaCacheTable.count(),
  ]);

  return {
    pixabaySearches,
    translations,
    phonetics,
    imageCache,
    conversaCache,
  };
};

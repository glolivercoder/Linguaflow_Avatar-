/**
 * conversaCacheService.ts
 * 
 * Provides IndexedDB-based caching for conversation-related data:
 * - Category translations
 * - Phonetic transcriptions
 * 
 * This reduces API calls to Gemini by caching results locally.
 */

const DB_NAME = 'LinguaFlowConversaCache';
const DB_VERSION = 1;
const TRANSLATION_STORE = 'translations';
const PHONETIC_STORE = 'phonetics';

let dbPromise: Promise<IDBDatabase> | null = null;

/**
 * Initialize and open the IndexedDB database
 */
function openDB(): Promise<IDBDatabase> {
    if (dbPromise) {
        return dbPromise;
    }

    dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => {
            console.error('Failed to open conversaCache database:', request.error);
            reject(request.error);
        };

        request.onsuccess = () => {
            resolve(request.result);
        };

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;

            // Create translations store if it doesn't exist
            if (!db.objectStoreNames.contains(TRANSLATION_STORE)) {
                db.createObjectStore(TRANSLATION_STORE, { keyPath: 'key' });
            }

            // Create phonetics store if it doesn't exist
            if (!db.objectStoreNames.contains(PHONETIC_STORE)) {
                db.createObjectStore(PHONETIC_STORE, { keyPath: 'text' });
            }
        };
    });

    return dbPromise;
}

/**
 * Get a cached translation from IndexedDB
 * @param cacheKey - The cache key (format: "langCode::text")
 * @returns The cached translation or null if not found
 */
export async function getCachedTranslation(cacheKey: string): Promise<string | null> {
    try {
        const db = await openDB();
        const transaction = db.transaction([TRANSLATION_STORE], 'readonly');
        const store = transaction.objectStore(TRANSLATION_STORE);
        const request = store.get(cacheKey);

        return new Promise((resolve, reject) => {
            request.onsuccess = () => {
                const result = request.result;
                resolve(result ? result.value : null);
            };
            request.onerror = () => {
                console.error('Error getting cached translation:', request.error);
                reject(request.error);
            };
        });
    } catch (error) {
        console.error('Error accessing translation cache:', error);
        return null;
    }
}

/**
 * Save a translation to IndexedDB cache
 * @param cacheKey - The cache key (format: "langCode::text")
 * @param value - The translated text
 */
export async function saveCachedTranslation(cacheKey: string, value: string): Promise<void> {
    try {
        const db = await openDB();
        const transaction = db.transaction([TRANSLATION_STORE], 'readwrite');
        const store = transaction.objectStore(TRANSLATION_STORE);
        
        store.put({
            key: cacheKey,
            value: value,
            timestamp: Date.now()
        });

        return new Promise((resolve, reject) => {
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => {
                console.error('Error saving cached translation:', transaction.error);
                reject(transaction.error);
            };
        });
    } catch (error) {
        console.error('Error saving to translation cache:', error);
    }
}

/**
 * Get a cached phonetic transcription from IndexedDB
 * @param text - The text to get phonetics for
 * @returns The cached phonetic transcription or null if not found
 */
export async function getCachedPhonetic(text: string): Promise<string | null> {
    try {
        const db = await openDB();
        const transaction = db.transaction([PHONETIC_STORE], 'readonly');
        const store = transaction.objectStore(PHONETIC_STORE);
        const request = store.get(text);

        return new Promise((resolve, reject) => {
            request.onsuccess = () => {
                const result = request.result;
                resolve(result ? result.phonetic : null);
            };
            request.onerror = () => {
                console.error('Error getting cached phonetic:', request.error);
                reject(request.error);
            };
        });
    } catch (error) {
        console.error('Error accessing phonetic cache:', error);
        return null;
    }
}

/**
 * Save a phonetic transcription to IndexedDB cache
 * @param text - The text
 * @param phonetic - The phonetic transcription
 */
export async function saveCachedPhonetic(text: string, phonetic: string): Promise<void> {
    try {
        const db = await openDB();
        const transaction = db.transaction([PHONETIC_STORE], 'readwrite');
        const store = transaction.objectStore(PHONETIC_STORE);
        
        store.put({
            text: text,
            phonetic: phonetic,
            timestamp: Date.now()
        });

        return new Promise((resolve, reject) => {
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => {
                console.error('Error saving cached phonetic:', transaction.error);
                reject(transaction.error);
            };
        });
    } catch (error) {
        console.error('Error saving to phonetic cache:', error);
    }
}

/**
 * Clear all cached translations
 */
export async function clearTranslationCache(): Promise<void> {
    try {
        const db = await openDB();
        const transaction = db.transaction([TRANSLATION_STORE], 'readwrite');
        const store = transaction.objectStore(TRANSLATION_STORE);
        store.clear();

        return new Promise((resolve, reject) => {
            transaction.oncomplete = () => {
                console.log('Translation cache cleared');
                resolve();
            };
            transaction.onerror = () => {
                console.error('Error clearing translation cache:', transaction.error);
                reject(transaction.error);
            };
        });
    } catch (error) {
        console.error('Error clearing translation cache:', error);
    }
}

/**
 * Clear all cached phonetics
 */
export async function clearPhoneticCache(): Promise<void> {
    try {
        const db = await openDB();
        const transaction = db.transaction([PHONETIC_STORE], 'readwrite');
        const store = transaction.objectStore(PHONETIC_STORE);
        store.clear();

        return new Promise((resolve, reject) => {
            transaction.oncomplete = () => {
                console.log('Phonetic cache cleared');
                resolve();
            };
            transaction.onerror = () => {
                console.error('Error clearing phonetic cache:', transaction.error);
                reject(transaction.error);
            };
        });
    } catch (error) {
        console.error('Error clearing phonetic cache:', error);
    }
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<{ translations: number; phonetics: number }> {
    try {
        const db = await openDB();
        
        const translationCount = await new Promise<number>((resolve, reject) => {
            const transaction = db.transaction([TRANSLATION_STORE], 'readonly');
            const store = transaction.objectStore(TRANSLATION_STORE);
            const request = store.count();
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });

        const phoneticCount = await new Promise<number>((resolve, reject) => {
            const transaction = db.transaction([PHONETIC_STORE], 'readonly');
            const store = transaction.objectStore(PHONETIC_STORE);
            const request = store.count();
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });

        return {
            translations: translationCount,
            phonetics: phoneticCount
        };
    } catch (error) {
        console.error('Error getting cache stats:', error);
        return { translations: 0, phonetics: 0 };
    }
}

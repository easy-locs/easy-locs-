const DB_NAME = "quran_offline_cache";
const DB_VERSION = 1;
const STORE_NAME = "surahs";
const MAX_CACHED_SURAHS = 30;
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

interface CachedSurah {
  key: string;
  surahNumber: number;
  language: string;
  ayahs: { number: number; arabic: string; translation: string; transliteration?: string }[];
  cachedAt: number;
  accessedAt: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "key" });
        store.createIndex("accessedAt", "accessedAt", { unique: false });
        store.createIndex("surahNumber", "surahNumber", { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function buildKey(surahNumber: number, language: string, withTransliteration: boolean): string {
  return `${surahNumber}:${language}:${withTransliteration ? "t" : "n"}`;
}

export async function getCachedSurah(
  surahNumber: number,
  language: string,
  withTransliteration: boolean
): Promise<CachedSurah["ayahs"] | null> {
  try {
    const db = await openDB();
    const key = buildKey(surahNumber, language, withTransliteration);
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => {
        const result = req.result as CachedSurah | undefined;
        if (!result) {
          resolve(null);
          return;
        }
        if (Date.now() - result.cachedAt > CACHE_TTL_MS) {
          store.delete(key);
          resolve(null);
          return;
        }
        result.accessedAt = Date.now();
        store.put(result);
        resolve(result.ayahs);
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function cacheSurah(
  surahNumber: number,
  language: string,
  withTransliteration: boolean,
  ayahs: CachedSurah["ayahs"]
): Promise<void> {
  try {
    const db = await openDB();
    const key = buildKey(surahNumber, language, withTransliteration);
    const now = Date.now();

    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);

    store.put({
      key,
      surahNumber,
      language,
      ayahs,
      cachedAt: now,
      accessedAt: now,
    } as CachedSurah);

    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });

    await evictIfNeeded();
  } catch {}
}

async function evictIfNeeded(): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const countReq = store.count();

    await new Promise<void>((resolve) => {
      countReq.onsuccess = () => {
        const count = countReq.result;
        if (count <= MAX_CACHED_SURAHS) {
          resolve();
          return;
        }

        const toRemove = count - MAX_CACHED_SURAHS;
        const index = store.index("accessedAt");
        const cursorReq = index.openCursor();
        let removed = 0;

        cursorReq.onsuccess = () => {
          const cursor = cursorReq.result;
          if (cursor && removed < toRemove) {
            store.delete(cursor.primaryKey);
            removed++;
            cursor.continue();
          } else {
            resolve();
          }
        };
        cursorReq.onerror = () => resolve();
      };
      countReq.onerror = () => resolve();
    });
  } catch {}
}

export async function getCacheStats(): Promise<{ count: number; surahs: number[] }> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);

    return new Promise((resolve) => {
      const allReq = store.getAll();
      allReq.onsuccess = () => {
        const now = Date.now();
        const entries = (allReq.result as CachedSurah[]).filter(e => now - e.cachedAt <= CACHE_TTL_MS);
        const uniqueSurahs = [...new Set(entries.map(e => e.surahNumber))].sort((a, b) => a - b);
        resolve({ count: entries.length, surahs: uniqueSurahs });
      };
      allReq.onerror = () => resolve({ count: 0, surahs: [] });
    });
  } catch {
    return { count: 0, surahs: [] };
  }
}

export async function clearCache(): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).clear();
    await new Promise<void>((resolve) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {}
}

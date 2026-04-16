const DB_NAME = "quran_offline_cache";
const DB_VERSION = 1;
const STORE_NAME = "surahs";
const MAX_CACHED_SURAHS = 30;
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const LS_STORAGE_LIMIT_KEY = "quran_offline_storage_limit_mb";
const DEFAULT_STORAGE_LIMIT_MB = 100;
const MIN_STORAGE_LIMIT_MB = 10;
const MAX_STORAGE_LIMIT_MB = 500;

interface CachedSurah {
  key: string;
  surahNumber: number;
  language: string;
  ayahs: { number: number; arabic: string; translation: string; transliteration?: string }[];
  cachedAt: number;
  accessedAt: number;
  pinned?: boolean;
}

export interface CachedSurahEntry {
  surahNumber: number;
  language: string;
  cachedAt: number;
  accessedAt: number;
  ayahCount: number;
  pinned: boolean;
  estimatedSizeBytes: number;
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
        if (!result.pinned && Date.now() - result.cachedAt > CACHE_TTL_MS) {
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
  ayahs: CachedSurah["ayahs"],
  pinned: boolean = false
): Promise<void> {
  try {
    const db = await openDB();
    const key = buildKey(surahNumber, language, withTransliteration);
    const now = Date.now();

    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);

    const existingReq = store.get(key);
    await new Promise<void>((resolve) => {
      existingReq.onsuccess = () => {
        const existing = existingReq.result as CachedSurah | undefined;
        store.put({
          key,
          surahNumber,
          language,
          ayahs,
          cachedAt: now,
          accessedAt: now,
          pinned: pinned || existing?.pinned || false,
        } as CachedSurah);
        resolve();
      };
      existingReq.onerror = () => {
        store.put({
          key,
          surahNumber,
          language,
          ayahs,
          cachedAt: now,
          accessedAt: now,
          pinned,
        } as CachedSurah);
        resolve();
      };
    });

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
            const entry = cursor.value as CachedSurah;
            if (!entry.pinned) {
              store.delete(cursor.primaryKey);
              removed++;
            }
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
        const entries = (allReq.result as CachedSurah[]).filter(
          e => e.pinned || now - e.cachedAt <= CACHE_TTL_MS
        );
        const uniqueSurahs = [...new Set(entries.map(e => e.surahNumber))].sort((a, b) => a - b);
        resolve({ count: entries.length, surahs: uniqueSurahs });
      };
      allReq.onerror = () => resolve({ count: 0, surahs: [] });
    });
  } catch {
    return { count: 0, surahs: [] };
  }
}

const VOD_LS_KEY = "quran_vod_cache";

interface CachedVoD {
  arabic: string;
  translation: string;
  ref: string;
  theme: string;
  cachedAt: number;
  dayKey: string;
}

export function cacheVerseOfDay(vod: { arabic: string; translation: string; ref: string; theme: string }): void {
  try {
    const now = new Date();
    const dayKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
    const entry: CachedVoD = { ...vod, cachedAt: Date.now(), dayKey };
    localStorage.setItem(VOD_LS_KEY, JSON.stringify(entry));
  } catch {}
}

export function getCachedVerseOfDay(): (CachedVoD & { isStale: boolean }) | null {
  try {
    const raw = localStorage.getItem(VOD_LS_KEY);
    if (!raw) return null;
    const entry: CachedVoD = JSON.parse(raw);
    if (Date.now() - entry.cachedAt > 7 * 24 * 60 * 60 * 1000) return null;
    const now = new Date();
    const todayKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
    return { ...entry, isStale: entry.dayKey !== todayKey };
  } catch {
    return null;
  }
}

export interface OfflineSearchResult {
  surah: number;
  ayah: number;
  text: string;
}

export async function searchCachedSurahs(query: string, preferredLanguage?: string): Promise<OfflineSearchResult[]> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);

    return new Promise((resolve) => {
      const allReq = store.getAll();
      allReq.onsuccess = () => {
        const now = Date.now();
        let entries = (allReq.result as CachedSurah[]).filter(e => now - e.cachedAt <= CACHE_TTL_MS);
        if (preferredLanguage) {
          const langEntries = entries.filter(e => e.language === preferredLanguage);
          if (langEntries.length > 0) entries = langEntries;
        }
        const lowerQuery = query.toLowerCase();
        const results: OfflineSearchResult[] = [];

        for (const entry of entries) {
          for (const ayah of entry.ayahs) {
            if (
              ayah.translation.toLowerCase().includes(lowerQuery) ||
              ayah.arabic.includes(query)
            ) {
              if (!results.some(r => r.surah === entry.surahNumber && r.ayah === ayah.number)) {
                results.push({
                  surah: entry.surahNumber,
                  ayah: ayah.number,
                  text: ayah.translation,
                });
              }
            }
            if (results.length >= 20) break;
          }
          if (results.length >= 20) break;
        }

        resolve(results);
      };
      allReq.onerror = () => resolve([]);
    });
  } catch {
    return [];
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

export async function isSurahCached(surahNumber: number): Promise<boolean> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const index = store.index("surahNumber");

    return new Promise((resolve) => {
      const req = index.getAll(surahNumber);
      req.onsuccess = () => {
        const results = req.result as CachedSurah[];
        const now = Date.now();
        const valid = results.some(e => e.pinned || now - e.cachedAt <= CACHE_TTL_MS);
        resolve(valid);
      };
      req.onerror = () => resolve(false);
    });
  } catch {
    return false;
  }
}

export interface CachedSurahStatus {
  cached: Set<number>;
  pinned: Set<number>;
}

export async function getCachedSurahStatus(): Promise<CachedSurahStatus> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);

    return new Promise((resolve) => {
      const allReq = store.getAll();
      allReq.onsuccess = () => {
        const now = Date.now();
        const valid = (allReq.result as CachedSurah[]).filter(
          e => e.pinned || now - e.cachedAt <= CACHE_TTL_MS
        );
        const cached = new Set(valid.map(e => e.surahNumber));
        const pinned = new Set(valid.filter(e => e.pinned).map(e => e.surahNumber));
        resolve({ cached, pinned });
      };
      allReq.onerror = () => resolve({ cached: new Set(), pinned: new Set() });
    });
  } catch {
    return { cached: new Set(), pinned: new Set() };
  }
}

function estimateCachedSurahSize(entry: CachedSurah): number {
  let size = 0;
  for (const ayah of entry.ayahs) {
    size += ayah.arabic.length * 2;
    size += ayah.translation.length * 2;
    if (ayah.transliteration) size += ayah.transliteration.length * 2;
    size += 16;
  }
  size += entry.key.length * 2 + entry.language.length * 2 + 64;
  return size;
}

export async function getAllCachedEntries(): Promise<CachedSurahEntry[]> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);

    return new Promise((resolve) => {
      const allReq = store.getAll();
      allReq.onsuccess = () => {
        const now = Date.now();
        const validEntries = (allReq.result as CachedSurah[])
          .filter(e => e.pinned || now - e.cachedAt <= CACHE_TTL_MS);
        const entries = validEntries.map(e => ({
            surahNumber: e.surahNumber,
            language: e.language,
            cachedAt: e.cachedAt,
            accessedAt: e.accessedAt,
            ayahCount: e.ayahs.length,
            pinned: e.pinned ?? false,
            estimatedSizeBytes: estimateCachedSurahSize(e),
          }));
        const grouped = new Map<number, CachedSurahEntry>();
        for (const entry of entries) {
          const existing = grouped.get(entry.surahNumber);
          if (!existing) {
            grouped.set(entry.surahNumber, entry);
          } else {
            grouped.set(entry.surahNumber, {
              ...existing,
              cachedAt: Math.max(existing.cachedAt, entry.cachedAt),
              accessedAt: Math.max(existing.accessedAt, entry.accessedAt),
              ayahCount: Math.max(existing.ayahCount, entry.ayahCount),
              pinned: existing.pinned || entry.pinned,
              estimatedSizeBytes: existing.estimatedSizeBytes + entry.estimatedSizeBytes,
            });
          }
        }
        resolve([...grouped.values()].sort((a, b) => a.surahNumber - b.surahNumber));
      };
      allReq.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

export interface StorageQuotaInfo {
  usageBytes: number;
  quotaBytes: number;
  percentUsed: number;
}

export async function getStorageQuota(): Promise<StorageQuotaInfo | null> {
  try {
    if (navigator.storage && navigator.storage.estimate) {
      const estimate = await navigator.storage.estimate();
      const usage = estimate.usage ?? 0;
      const quota = estimate.quota ?? 0;
      return {
        usageBytes: usage,
        quotaBytes: quota,
        percentUsed: quota > 0 ? (usage / quota) * 100 : 0,
      };
    }
    return null;
  } catch {
    return null;
  }
}

export async function removeCachedSurah(surahNumber: number): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const index = store.index("surahNumber");

    await new Promise<void>((resolve) => {
      const req = index.getAllKeys(surahNumber);
      req.onsuccess = () => {
        for (const key of req.result) {
          store.delete(key);
        }
        resolve();
      };
      req.onerror = () => resolve();
    });

    await new Promise<void>((resolve) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {}
}

export async function pinSurah(
  surahNumber: number,
  language: string,
  withTransliteration: boolean,
  ayahs: CachedSurah["ayahs"]
): Promise<void> {
  return cacheSurah(surahNumber, language, withTransliteration, ayahs, true);
}

export interface BulkDownloadProgress {
  total: number;
  completed: number;
  failed: number;
  failedSurahs: number[];
  current: number | null;
  done: boolean;
}

const BASE_DELAY_MS = 300;
const MAX_DELAY_MS = 5000;

export function computeBackoffDelay(retryAttempt: number): number {
  const delay = BASE_DELAY_MS * Math.pow(2, retryAttempt);
  return Math.min(delay, MAX_DELAY_MS);
}

export async function bulkPinSurahs(
  surahNumbers: number[],
  language: string,
  withTransliteration: boolean,
  fetchFn: (url: string) => Promise<Response>,
  onProgress: (progress: BulkDownloadProgress) => void,
  signal?: AbortSignal,
  retryAttempts?: Map<number, number>
): Promise<void> {
  const status = await getCachedSurahStatus();
  const needed = surahNumbers.filter(n => !status.pinned.has(n));

  if (needed.length === 0) {
    onProgress({ total: 0, completed: 0, failed: 0, failedSurahs: [], current: null, done: true });
    return;
  }

  const progress: BulkDownloadProgress = {
    total: needed.length,
    completed: 0,
    failed: 0,
    failedSurahs: [],
    current: null,
    done: false,
  };
  onProgress({ ...progress });

  for (const surahNum of needed) {
    if (signal?.aborted) break;

    const currentBytes = await getTotalCacheSizeBytes();
    const limitBytes = getStorageLimitMB() * 1024 * 1024;
    if (currentBytes >= limitBytes) break;

    progress.current = surahNum;
    onProgress({ ...progress });

    try {
      const fetches: Promise<Response>[] = [
        fetchFn(`https://api.alquran.cloud/v1/surah/${surahNum}`),
        fetchFn(`https://api.alquran.cloud/v1/surah/${surahNum}/${language}`),
      ];
      if (withTransliteration) {
        fetches.push(
          fetchFn(`https://api.alquran.cloud/v1/surah/${surahNum}/en.transliteration`)
            .catch(() => new Response(JSON.stringify({ code: 0 })))
        );
      }
      const responses = await Promise.all(fetches);
      const arJson = await responses[0].json();
      const trJson = await responses[1].json();
      let transLitJson: { code: number; data?: { ayahs: { numberInSurah: number; text: string }[] } } | null = null;
      if (responses[2]) transLitJson = await responses[2].json();

      if (arJson.code === 200 && trJson.code === 200) {
        const merged = arJson.data.ayahs.map((a: { numberInSurah: number; text: string }, i: number) => ({
          number: a.numberInSurah,
          arabic: a.text,
          translation: trJson.data.ayahs[i]?.text ?? "",
          transliteration: transLitJson?.code === 200 ? transLitJson.data?.ayahs[i]?.text : undefined,
        }));
        await pinSurah(surahNum, language, withTransliteration, merged);
        progress.completed++;
      } else {
        progress.failed++;
        progress.failedSurahs.push(surahNum);
      }
    } catch {
      progress.failed++;
      progress.failedSurahs.push(surahNum);
    }

    onProgress({ ...progress, failedSurahs: [...progress.failedSurahs] });

    if (!signal?.aborted && needed.indexOf(surahNum) < needed.length - 1) {
      const surahAttempt = retryAttempts?.get(surahNum) ?? 0;
      await new Promise(r => setTimeout(r, computeBackoffDelay(surahAttempt)));
    }
  }

  progress.current = null;
  progress.done = true;
  onProgress({ ...progress, failedSurahs: [...progress.failedSurahs] });
}

export function getStorageLimitMB(): number {
  try {
    const raw = localStorage.getItem(LS_STORAGE_LIMIT_KEY);
    if (raw) {
      const val = parseInt(raw, 10);
      if (!isNaN(val) && val >= MIN_STORAGE_LIMIT_MB && val <= MAX_STORAGE_LIMIT_MB) return val;
    }
  } catch {}
  return DEFAULT_STORAGE_LIMIT_MB;
}

export function setStorageLimitMB(mb: number): void {
  const clamped = Math.max(MIN_STORAGE_LIMIT_MB, Math.min(MAX_STORAGE_LIMIT_MB, Math.round(mb)));
  try { localStorage.setItem(LS_STORAGE_LIMIT_KEY, String(clamped)); } catch {}
}

export { MIN_STORAGE_LIMIT_MB, MAX_STORAGE_LIMIT_MB, DEFAULT_STORAGE_LIMIT_MB };

export async function getTotalCacheSizeBytes(): Promise<number> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);

    return new Promise((resolve) => {
      const allReq = store.getAll();
      allReq.onsuccess = () => {
        const now = Date.now();
        const valid = (allReq.result as CachedSurah[]).filter(
          e => e.pinned || now - e.cachedAt <= CACHE_TTL_MS
        );
        const total = valid.reduce((sum, e) => sum + estimateCachedSurahSize(e), 0);
        resolve(total);
      };
      allReq.onerror = () => resolve(0);
    });
  } catch {
    return 0;
  }
}

export async function isStorageLimitExceeded(): Promise<{ exceeded: boolean; currentMB: number; limitMB: number; percentUsed: number }> {
  const totalBytes = await getTotalCacheSizeBytes();
  const currentMB = totalBytes / (1024 * 1024);
  const limitMB = getStorageLimitMB();
  const percentUsed = limitMB > 0 ? (currentMB / limitMB) * 100 : 0;
  return { exceeded: currentMB >= limitMB, currentMB, limitMB, percentUsed };
}

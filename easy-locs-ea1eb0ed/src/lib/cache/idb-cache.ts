/**
 * IndexedDB persistent cache for stale-while-revalidate pattern.
 * Stores query results locally so screens load instantly on revisit.
 */

const DB_NAME = "easylocs_cache";
const STORE_NAME = "query_cache";
const DB_VERSION = 1;

interface CacheEntry {
  key: string;
  data: unknown;
  timestamp: number;
  ttlMs: number;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "key" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => {
      dbPromise = null;
      reject(req.error);
    };
  });
  return dbPromise;
}

function toTx(mode: IDBTransactionMode): Promise<IDBObjectStore> {
  return openDB().then(db => {
    const tx = db.transaction(STORE_NAME, mode);
    return tx.objectStore(STORE_NAME);
  });
}

export async function getCached<T>(key: string): Promise<T | undefined> {
  try {
    const store = await toTx("readonly");
    return new Promise((resolve) => {
      const req = store.get(key);
      req.onsuccess = () => {
        const entry = req.result as CacheEntry | undefined;
        if (!entry) { resolve(undefined); return; }
        const age = Date.now() - entry.timestamp;
        if (age > entry.ttlMs * 10) {
          resolve(undefined);
          return;
        }
        resolve(entry.data as T);
      };
      req.onerror = () => resolve(undefined);
    });
  } catch {
    return undefined;
  }
}

export async function setCached(key: string, data: unknown, ttlMs: number = 10 * 60 * 1000): Promise<void> {
  try {
    const store = await toTx("readwrite");
    const entry: CacheEntry = { key, data, timestamp: Date.now(), ttlMs };
    store.put(entry);
  } catch {}
}

export async function removeCached(key: string): Promise<void> {
  try {
    const store = await toTx("readwrite");
    store.delete(key);
  } catch {}
}

export async function clearAllCache(): Promise<void> {
  try {
    const store = await toTx("readwrite");
    store.clear();
  } catch {}
}

export function isCacheFresh(timestamp: number, ttlMs: number): boolean {
  return Date.now() - timestamp < ttlMs;
}

export function cacheKey(...parts: (string | number | undefined | null)[]): string {
  return parts.filter(Boolean).join(":");
}

export async function getOrFetch<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttlMs: number = 5 * 60 * 1000,
): Promise<T> {
  const cached = await getCached<T>(key);
  if (cached !== undefined) {
    fetchFn().then(fresh => setCached(key, fresh, ttlMs)).catch(() => {});
    return cached;
  }
  const fresh = await fetchFn();
  setCached(key, fresh, ttlMs).catch(() => {});
  return fresh;
}

export async function listAllKeys(): Promise<string[]> {
  try {
    const store = await toTx("readonly");
    return new Promise<string[]>((resolve) => {
      const req = store.getAllKeys();
      req.onsuccess = () => resolve((req.result || []).map(String));
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

export const idbGet = getCached;
export const idbSet = async <T>(key: string, value: T, ttlMs?: number): Promise<void> => {
  await setCached(key, value, ttlMs ?? 4 * 60 * 60 * 1000);
};
export const idbDelete = removeCached;
export const idbClear = clearAllCache;
export const cachedFetch = getOrFetch;

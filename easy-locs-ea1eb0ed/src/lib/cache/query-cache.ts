interface CacheEntry<T> {
  data: T;
  expiresAt: number;
  staleAt: number;
}

const cache = new Map<string, CacheEntry<unknown>>();
const MAX_ENTRIES = 500;
const pendingRefreshes = new Set<string>();

interface ClientCacheOptions {
  ttlMs: number;
  staleWhileRevalidateMs?: number;
  namespace: string;
  keyParts: string[];
}

function buildKey(namespace: string, keyParts: string[]): string {
  return `cc:${namespace}:${keyParts.join(":")}`;
}

function evictIfNeeded(): void {
  if (cache.size < MAX_ENTRIES) return;

  const now = Date.now();
  for (const [key, entry] of cache) {
    if (entry.expiresAt < now) {
      cache.delete(key);
    }
  }

  if (cache.size >= MAX_ENTRIES) {
    let oldestKey = "";
    let oldestTime = Infinity;
    for (const [key, entry] of cache) {
      if (entry.expiresAt < oldestTime) {
        oldestTime = entry.expiresAt;
        oldestKey = key;
      }
    }
    if (oldestKey) cache.delete(oldestKey);
  }
}

export async function cachedFetch<T>(
  options: ClientCacheOptions,
  fetcher: () => Promise<T>,
): Promise<T> {
  const key = buildKey(options.namespace, options.keyParts);
  const now = Date.now();
  const existing = cache.get(key) as CacheEntry<T> | undefined;

  if (existing) {
    if (existing.expiresAt > now) {
      return existing.data;
    }

    if (
      options.staleWhileRevalidateMs &&
      existing.staleAt > now &&
      !pendingRefreshes.has(key)
    ) {
      pendingRefreshes.add(key);
      fetcher()
        .then((freshData) => {
          evictIfNeeded();
          cache.set(key, {
            data: freshData,
            expiresAt: now + options.ttlMs,
            staleAt: now + options.ttlMs + (options.staleWhileRevalidateMs ?? 0),
          });
        })
        .catch(() => {})
        .finally(() => pendingRefreshes.delete(key));

      return existing.data;
    }
  }

  const data = await fetcher();
  evictIfNeeded();
  cache.set(key, {
    data,
    expiresAt: now + options.ttlMs,
    staleAt: now + options.ttlMs + (options.staleWhileRevalidateMs ?? 0),
  });
  return data;
}

export function invalidateClientCache(namespace: string, keyParts?: string[]): void {
  if (keyParts && keyParts.length > 0) {
    const key = buildKey(namespace, keyParts);
    cache.delete(key);
    return;
  }

  const prefix = `cc:${namespace}:`;
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) {
      cache.delete(key);
    }
  }
}

export function invalidateAllClientCache(): void {
  cache.clear();
}

export function getClientCacheStats(): {
  entries: number;
  maxEntries: number;
  namespaces: Record<string, number>;
} {
  const namespaces: Record<string, number> = {};
  for (const key of cache.keys()) {
    const parts = key.split(":");
    const ns = parts[1] || "unknown";
    namespaces[ns] = (namespaces[ns] || 0) + 1;
  }
  return { entries: cache.size, maxEntries: MAX_ENTRIES, namespaces };
}

export const CLIENT_CACHE_NS = {
  TRENDING: "trending",
  CATEGORIES: "categories",
  DASHBOARD: "dashboard",
  SEARCH: "search",
  STOREFRONTS: "storefronts",
  PROPERTIES: "properties",
} as const;

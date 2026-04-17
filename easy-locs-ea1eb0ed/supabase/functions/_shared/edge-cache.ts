import { redisGet, redisSet, redisDel } from "./redis-client.ts";

export interface CacheOptions {
  ttlSeconds: number;
  varyByUser?: boolean;
  varyByGeo?: boolean;
  varyByRole?: boolean;
  namespace?: string;
}

const DEFAULT_TTL = 60;

const memoryCache = new Map<string, { data: string; expiresAt: number }>();
const MAX_MEMORY_CACHE = 200;

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

function buildCacheKey(
  path: string,
  queryParams: string,
  options: CacheOptions,
  userId?: string,
  geo?: string,
  role?: string,
  bodyHash?: string,
): string {
  const parts = [options.namespace || "edge", path, queryParams];
  if (bodyHash) parts.push(`b:${bodyHash}`);
  if (options.varyByUser && userId) parts.push(`u:${userId}`);
  if (options.varyByGeo && geo) parts.push(`g:${geo}`);
  if (options.varyByRole && role) parts.push(`r:${role}`);
  return parts.join("|");
}

function evictOldest(): void {
  if (memoryCache.size < MAX_MEMORY_CACHE) return;
  let oldestKey = "";
  let oldestTime = Infinity;
  for (const [key, entry] of memoryCache) {
    if (entry.expiresAt < oldestTime) {
      oldestTime = entry.expiresAt;
      oldestKey = key;
    }
  }
  if (oldestKey) memoryCache.delete(oldestKey);
}

export async function getCachedResponse(
  req: Request,
  options: CacheOptions,
  userId?: string,
  geo?: string,
  role?: string,
  bodyFingerprint?: string,
): Promise<Response | null> {
  const url = new URL(req.url);
  const bodyHash = bodyFingerprint ? simpleHash(bodyFingerprint) : undefined;
  const key = buildCacheKey(url.pathname, url.search, options, userId, geo, role, bodyHash);

  const memEntry = memoryCache.get(key);
  if (memEntry && memEntry.expiresAt > Date.now()) {
    return new Response(memEntry.data, {
      headers: {
        "Content-Type": "application/json",
        "X-Cache": "HIT-MEMORY",
        "X-Cache-Key": key,
      },
    });
  }

  const redisData = await redisGet<string>(key);
  if (redisData) {
    evictOldest();
    memoryCache.set(key, {
      data: typeof redisData === "string" ? redisData : JSON.stringify(redisData),
      expiresAt: Date.now() + (options.ttlSeconds || DEFAULT_TTL) * 1000,
    });

    return new Response(
      typeof redisData === "string" ? redisData : JSON.stringify(redisData),
      {
        headers: {
          "Content-Type": "application/json",
          "X-Cache": "HIT-REDIS",
          "X-Cache-Key": key,
        },
      }
    );
  }

  return null;
}

export async function setCachedResponse(
  req: Request,
  responseBody: string,
  options: CacheOptions,
  userId?: string,
  geo?: string,
  role?: string,
  bodyFingerprint?: string,
): Promise<void> {
  const url = new URL(req.url);
  const bodyHash = bodyFingerprint ? simpleHash(bodyFingerprint) : undefined;
  const key = buildCacheKey(url.pathname, url.search, options, userId, geo, role, bodyHash);
  const ttl = options.ttlSeconds || DEFAULT_TTL;

  evictOldest();
  memoryCache.set(key, { data: responseBody, expiresAt: Date.now() + ttl * 1000 });

  await redisSet(key, responseBody, ttl);
}

export async function invalidateCache(
  namespace: string,
  patterns: string[],
): Promise<number> {
  let deleted = 0;

  for (const [key] of memoryCache) {
    if (key.startsWith(namespace)) {
      for (const pattern of patterns) {
        if (key.includes(pattern)) {
          memoryCache.delete(key);
          deleted++;
          break;
        }
      }
    }
  }

  for (const pattern of patterns) {
    const fullKey = `${namespace}|${pattern}`;
    const count = await redisDel(fullKey);
    deleted += count;
  }

  return deleted;
}

export async function invalidateCacheOnMutation(domain: string): Promise<void> {
  const keysToDelete: string[] = [];
  for (const [key] of memoryCache) {
    if (key.startsWith(domain)) {
      keysToDelete.push(key);
    }
  }
  for (const key of keysToDelete) {
    memoryCache.delete(key);
  }

  const client = (await import("./redis-client.ts")).getRedisClient();
  if (client) {
    try {
      let cursor = "0";
      const redisKeysToDelete: string[] = [];
      do {
        const result = await client.scan(cursor, { match: `${domain}|*`, count: 100 });
        cursor = String(result[0]);
        const keys = result[1] as string[];
        if (keys.length > 0) redisKeysToDelete.push(...keys);
      } while (cursor !== "0");

      if (redisKeysToDelete.length > 0) {
        await client.del(...redisKeysToDelete);
      }
    } catch (err) {
      console.warn(`[edge-cache] Redis invalidation failed for domain ${domain}:`, err);
    }
  }
}

export function getCacheStats(): {
  memoryEntries: number;
  maxMemory: number;
} {
  return {
    memoryEntries: memoryCache.size,
    maxMemory: MAX_MEMORY_CACHE,
  };
}

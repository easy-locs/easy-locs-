import { redisGet, redisSet, isRedisAvailable } from "./redis-client.ts";

interface CacheKeyOptions {
  path: string;
  userRole?: string;
  geo?: string;
  params?: Record<string, string>;
}

interface CacheConfig {
  ttlSeconds: number;
  varyBy?: ("userRole" | "geo" | "params")[];
  staleWhileRevalidate?: number;
}

const DEFAULT_TTL = 60;
const MAX_TTL = 3600;

export function buildCacheKey(options: CacheKeyOptions): string {
  const parts = ["edge-cache", options.path];
  if (options.userRole) parts.push(`role:${options.userRole}`);
  if (options.geo) parts.push(`geo:${options.geo}`);
  if (options.params) {
    const sorted = Object.keys(options.params).sort();
    for (const key of sorted) {
      parts.push(`${key}:${options.params[key]}`);
    }
  }
  return parts.join(":");
}

function generateETag(body: string): string {
  let hash = 0;
  for (let i = 0; i < body.length; i++) {
    const char = body.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return `"${Math.abs(hash).toString(36)}"`;
}

export function extractGeo(req: Request): string {
  return req.headers.get("cf-ipcountry") ??
    req.headers.get("x-country-code") ??
    "unknown";
}

export function extractUserRole(req: Request): string {
  return req.headers.get("x-user-role") ?? "anonymous";
}

export function cacheHeaders(config: CacheConfig, etag?: string): Record<string, string> {
  const ttl = Math.min(config.ttlSeconds, MAX_TTL);
  const headers: Record<string, string> = {
    "Cache-Control": `public, max-age=${ttl}${config.staleWhileRevalidate ? `, stale-while-revalidate=${config.staleWhileRevalidate}` : ""}`,
  };
  if (etag) headers["ETag"] = etag;

  const vary: string[] = ["Accept-Encoding"];
  if (config.varyBy?.includes("userRole")) vary.push("X-User-Role");
  if (config.varyBy?.includes("geo")) vary.push("CF-IPCountry");
  headers["Vary"] = vary.join(", ");

  return headers;
}

export async function getCachedResponse(cacheKey: string): Promise<{
  body: string;
  headers: Record<string, string>;
  etag: string;
} | null> {
  const mem = (globalThis as Record<string, Record<string, { body: string; headers: Record<string, string>; etag: string; expiresAt: number }>>).__edgeCacheMemory;
  if (mem?.[cacheKey] && mem[cacheKey].expiresAt > Date.now()) {
    return { body: mem[cacheKey].body, headers: { ...mem[cacheKey].headers, "X-Cache": "HIT" }, etag: mem[cacheKey].etag };
  }

  if (!isRedisAvailable()) return null;
  try {
    const cached = await redisGet<{ body: string; headers: Record<string, string>; etag: string }>(cacheKey);
    if (cached) {
      return { body: cached.body, headers: { ...cached.headers, "X-Cache": "HIT" }, etag: cached.etag };
    }
  } catch {
    // cache miss
  }
  return null;
}

export async function setCachedResponse(
  cacheKey: string,
  body: string,
  headers: Record<string, string>,
  ttlSeconds: number
): Promise<void> {
  const etag = generateETag(body);
  const entry = { body, headers: { ...headers, ETag: etag }, etag, expiresAt: Date.now() + ttlSeconds * 1000 };

  const mem = ((globalThis as Record<string, Record<string, unknown>>).__edgeCacheMemory ??= {}) as Record<string, typeof entry>;
  mem[cacheKey] = entry;

  const memKeys = Object.keys(mem);
  if (memKeys.length > 200) {
    const oldest = memKeys.sort((a, b) => (mem[a] as typeof entry).expiresAt - (mem[b] as typeof entry).expiresAt);
    for (let i = 0; i < 50; i++) delete mem[oldest[i]];
  }

  if (!isRedisAvailable()) return;
  try {
    await redisSet(cacheKey, { body, headers: { ...headers, ETag: etag }, etag }, ttlSeconds);
  } catch {
    // ignore cache set failures — memory cache is still active
  }
}

export async function invalidateCache(pattern: string): Promise<void> {
  if (!isRedisAvailable()) {
    const mem = (globalThis as Record<string, Record<string, unknown>>).__edgeCacheMemory;
    if (mem) {
      for (const key of Object.keys(mem)) {
        if (key.includes(pattern)) delete mem[key];
      }
    }
    return;
  }
  try {
    const { redisDel, redisKeys } = await import("./redis-client.ts");
    const keys = await redisKeys(`edge-cache:${pattern}*`);
    if (keys?.length) {
      for (const key of keys) await redisDel(key);
    }
    console.log(`[edge-cache] Invalidated ${keys?.length ?? 0} keys for pattern: ${pattern}`);
  } catch (err) {
    console.warn(`[edge-cache] Invalidation failed for pattern: ${pattern}`, err);
  }
}

export function shouldCache(req: Request): boolean {
  if (req.headers.get("cache-control")?.includes("no-cache")) return false;
  if (req.method === "GET") return true;
  return false;
}

export function shouldCacheReadEndpoint(req: Request): boolean {
  if (req.headers.get("cache-control")?.includes("no-cache")) return false;
  return true;
}

export async function buildPostCacheKey(options: CacheKeyOptions & { body?: string }): Promise<string> {
  const base = buildCacheKey(options);
  if (!options.body) return base;

  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(options.body));
  const hashHex = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("").substring(0, 16);
  return `${base}:body:${hashHex}`;
}

export function checkETagMatch(req: Request, etag: string): boolean {
  const ifNoneMatch = req.headers.get("if-none-match");
  return ifNoneMatch === etag;
}

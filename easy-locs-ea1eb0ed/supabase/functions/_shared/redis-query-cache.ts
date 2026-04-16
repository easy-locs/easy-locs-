import { redisGet, redisSet, redisDel, getRedisClient } from "./redis-client.ts";

export interface QueryCacheOptions {
  ttlSeconds: number;
  namespace: string;
  keyParts?: string[];
}

const DEFAULT_TTL = 300;

function buildQueryCacheKey(namespace: string, keyParts: string[]): string {
  return `qc:${namespace}:${keyParts.join(":")}`;
}

export async function getCachedQuery<T>(
  options: QueryCacheOptions,
): Promise<T | null> {
  const key = buildQueryCacheKey(options.namespace, options.keyParts ?? []);
  const cached = await redisGet<T>(key);
  return cached ?? null;
}

export async function setCachedQuery<T>(
  data: T,
  options: QueryCacheOptions,
): Promise<void> {
  const key = buildQueryCacheKey(options.namespace, options.keyParts ?? []);
  await redisSet(key, data, options.ttlSeconds || DEFAULT_TTL);
}

export async function invalidateQueryCache(
  namespace: string,
  keyParts?: string[],
): Promise<number> {
  if (keyParts && keyParts.length > 0) {
    const key = buildQueryCacheKey(namespace, keyParts);
    return redisDel(key);
  }

  const client = getRedisClient();
  if (!client) return 0;

  try {
    const pattern = `qc:${namespace}:*`;
    const keys: string[] = [];
    let cursor = "0";
    do {
      const result: [string, string[]] = await client.scan(cursor, { match: pattern, count: 100 });
      cursor = String(result[0]);
      if (result[1] && result[1].length > 0) {
        keys.push(...result[1]);
      }
    } while (cursor !== "0");

    if (keys.length > 0) {
      return redisDel(...keys);
    }
    return 0;
  } catch (err) {
    console.warn(`[redis-query-cache] invalidateQueryCache failed for ${namespace}:`, err);
    return 0;
  }
}

export async function cachedQuery<T>(
  options: QueryCacheOptions,
  fetcher: () => Promise<T>,
): Promise<T> {
  const cached = await getCachedQuery<T>(options);
  if (cached !== null) return cached;

  const result = await fetcher();
  await setCachedQuery(result, options);
  return result;
}

export const QUERY_CACHE_NAMESPACES = {
  TRENDING_LISTINGS: "trending_listings",
  POPULAR_CATEGORIES: "popular_categories",
  USER_DASHBOARD: "user_dashboard",
  SEARCH_RESULTS: "search_results",
  STOREFRONT_DETAILS: "storefront_details",
  PROPERTY_LISTINGS: "property_listings",
  SERVICE_LISTINGS: "service_listings",
} as const;

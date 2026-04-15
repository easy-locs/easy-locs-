import { redisGet, redisSet, isRedisAvailable } from "../redis/redis-client";

const profileCache = new Map<string, { name: string; avatar?: string; orbitId?: string; ts: number }>();
const CACHE_TTL = 5 * 60 * 1000;
const REDIS_TTL_SECONDS = 300;
const REDIS_KEY_PREFIX = "identity:";

export function getCachedIdentity(userId: string) {
  const cached = profileCache.get(userId);
  if (!cached) return null;
  if (Date.now() - cached.ts > CACHE_TTL) {
    profileCache.delete(userId);
    return null;
  }
  return cached;
}

export async function getCachedIdentityAsync(userId: string) {
  const local = getCachedIdentity(userId);
  if (local) return local;

  if (!isRedisAvailable()) return null;

  try {
    const redisData = await redisGet<{ name: string; avatar?: string; orbitId?: string }>(`${REDIS_KEY_PREFIX}${userId}`);
    if (redisData) {
      const entry = { ...redisData, ts: Date.now() };
      profileCache.set(userId, entry);
      return entry;
    }
  } catch {
    // Redis error — return null
  }

  return null;
}

export function setCachedIdentity(userId: string, data: { name: string; avatar?: string; orbitId?: string }) {
  profileCache.set(userId, { ...data, ts: Date.now() });

  if (isRedisAvailable()) {
    redisSet(`${REDIS_KEY_PREFIX}${userId}`, data, REDIS_TTL_SECONDS).catch(() => {});
  }
}

export function invalidateIdentityCache(userId?: string) {
  if (userId) {
    profileCache.delete(userId);
  } else {
    profileCache.clear();
  }
}

export function getCacheSize() {
  return profileCache.size;
}

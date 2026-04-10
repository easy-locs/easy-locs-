/**
 * Identity Cache — Cached identity resolution for hot-path performance.
 * Prevents redundant DB calls for the same user ID within a session.
 */

const profileCache = new Map<string, { name: string; avatar?: string; orbitId?: string; ts: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export function getCachedIdentity(userId: string) {
  const cached = profileCache.get(userId);
  if (!cached) return null;
  if (Date.now() - cached.ts > CACHE_TTL) {
    profileCache.delete(userId);
    return null;
  }
  return cached;
}

export function setCachedIdentity(userId: string, data: { name: string; avatar?: string; orbitId?: string }) {
  profileCache.set(userId, { ...data, ts: Date.now() });
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

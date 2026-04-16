export const REFERRAL_CODE_KEY = "easylocs_referral_code";
export const REFERRAL_TRACKED_KEY = "easylocs_ref_tracked";
export const PENDING_REF_KEY = "easylocs_pending_ref_code";

const CACHE_TTL_MS = 30 * 60 * 1000;

interface CacheEntry {
  value: string;
  expiresAt: number;
}

const _memoryStore = new Map<string, CacheEntry>();

export const referralMemoryCache = {
  get(key: string): string | undefined {
    const entry = _memoryStore.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      _memoryStore.delete(key);
      return undefined;
    }
    return entry.value;
  },
  set(key: string, value: string) {
    _memoryStore.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
  },
  has(key: string): boolean {
    return this.get(key) !== undefined;
  },
  delete(key: string) {
    _memoryStore.delete(key);
  },
  clear() {
    _memoryStore.clear();
  },
  get size() {
    return _memoryStore.size;
  },
};

export function clearReferralCaches() {
  try { localStorage.removeItem(REFERRAL_CODE_KEY); } catch {}
  try { sessionStorage.removeItem(REFERRAL_TRACKED_KEY); } catch {}
  try { sessionStorage.removeItem(PENDING_REF_KEY); } catch {}
  referralMemoryCache.clear();
}

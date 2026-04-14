/**
 * cache-layer — In-memory LRU cache with TTL, domain scoping, and invalidation.
 *
 * Provides O(1) get/set with automatic eviction. Each domain (profiles, configs,
 * fx-rates, search, media, listings) has its own TTL. Cache entries are evicted
 * when capacity is reached (LRU) or TTL expires.
 *
 * Server-side caching is handled by the cache-manager edge function which manages
 * the server_cache table. This module focuses on client-side hot-path caching.
 *
 * Integration points:
 * - useCurrencyConversion: fx-rates domain
 * - profile.repository: profiles domain
 * - search hooks: search domain
 * - config/settings: configs domain
 */

export type CacheDomain =
  | "profiles"
  | "configs"
  | "fx-rates"
  | "search"
  | "media"
  | "listings"
  | "conversations"
  | "general";

const DOMAIN_TTL_MS: Record<CacheDomain, number> = {
  profiles: 5 * 60_000,
  configs: 60 * 60_000,
  "fx-rates": 15 * 60_000,
  search: 10 * 60_000,
  media: 30 * 60_000,
  listings: 5 * 60_000,
  conversations: 2 * 60_000,
  general: 5 * 60_000,
};

interface CacheEntry<T = unknown> {
  key: string;
  value: T;
  domain: CacheDomain;
  expiresAt: number;
  accessedAt: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  size: number;
  maxSize: number;
  domainCounts: Record<string, number>;
}

class LRUCache {
  private store = new Map<string, CacheEntry>();
  private readonly maxEntries: number;
  private stats: CacheStats;
  private listeners = new Set<(event: CacheEvent) => void>();

  constructor(maxEntries = 500) {
    this.maxEntries = maxEntries;
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      size: 0,
      maxSize: maxEntries,
      domainCounts: {},
    };
  }

  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.delete(key);
      this.stats.misses++;
      return null;
    }

    entry.accessedAt = Date.now();
    this.store.delete(key);
    this.store.set(key, entry);
    this.stats.hits++;
    return entry.value as T;
  }

  set<T>(key: string, value: T, domain: CacheDomain = "general", ttlMs?: number): void {
    if (this.store.has(key)) {
      this.delete(key);
    }

    while (this.store.size >= this.maxEntries) {
      this.evictLRU();
    }

    const effectiveTtl = ttlMs ?? DOMAIN_TTL_MS[domain];
    const entry: CacheEntry<T> = {
      key,
      value,
      domain,
      expiresAt: Date.now() + effectiveTtl,
      accessedAt: Date.now(),
    };

    this.store.set(key, entry as CacheEntry);
    this.stats.size = this.store.size;
    this.stats.domainCounts[domain] = (this.stats.domainCounts[domain] ?? 0) + 1;
    this.emit({ type: "set", key, domain });
  }

  delete(key: string): boolean {
    const entry = this.store.get(key);
    if (!entry) return false;
    this.store.delete(key);
    this.stats.size = this.store.size;
    const dc = this.stats.domainCounts[entry.domain];
    if (dc !== undefined && dc > 0) {
      this.stats.domainCounts[entry.domain] = dc - 1;
    }
    this.emit({ type: "delete", key, domain: entry.domain });
    return true;
  }

  invalidateDomain(domain: CacheDomain): number {
    let count = 0;
    for (const [key, entry] of this.store) {
      if (entry.domain === domain) {
        this.store.delete(key);
        count++;
      }
    }
    this.stats.size = this.store.size;
    this.stats.domainCounts[domain] = 0;
    this.emit({ type: "invalidate-domain", key: domain, domain });
    return count;
  }

  invalidatePattern(pattern: string): number {
    let count = 0;
    const regex = new RegExp(pattern);
    for (const [key] of this.store) {
      if (regex.test(key)) {
        this.store.delete(key);
        count++;
      }
    }
    this.stats.size = this.store.size;
    this.emit({ type: "invalidate-pattern", key: pattern, domain: "general" });
    return count;
  }

  clear(): void {
    this.store.clear();
    this.stats.size = 0;
    this.stats.domainCounts = {};
    this.emit({ type: "clear", key: "*", domain: "general" });
  }

  has(key: string): boolean {
    const entry = this.store.get(key);
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
      this.delete(key);
      return false;
    }
    return true;
  }

  getStats(): Readonly<CacheStats> {
    return { ...this.stats };
  }

  getHitRate(): number {
    const total = this.stats.hits + this.stats.misses;
    return total === 0 ? 0 : Math.round((this.stats.hits / total) * 10000) / 100;
  }

  prune(): number {
    const now = Date.now();
    let count = 0;
    for (const [key, entry] of this.store) {
      if (now > entry.expiresAt) {
        this.store.delete(key);
        count++;
      }
    }
    this.stats.size = this.store.size;
    return count;
  }

  subscribe(fn: (event: CacheEvent) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private evictLRU(): void {
    const oldest = this.store.keys().next().value;
    if (oldest !== undefined) {
      this.delete(oldest);
      this.stats.evictions++;
    }
  }

  private emit(event: CacheEvent): void {
    for (const fn of this.listeners) {
      try { fn(event); } catch {}
    }
  }
}

export interface CacheEvent {
  type: "set" | "delete" | "invalidate-domain" | "invalidate-pattern" | "clear";
  key: string;
  domain: CacheDomain;
}

export const appCache = new LRUCache(500);

let _pruneInterval: ReturnType<typeof setInterval> | null = null;

export function startCachePruning(intervalMs = 60_000): void {
  if (_pruneInterval) return;
  _pruneInterval = setInterval(() => appCache.prune(), intervalMs);
}

export function stopCachePruning(): void {
  if (_pruneInterval) {
    clearInterval(_pruneInterval);
    _pruneInterval = null;
  }
}

export function cachedFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  domain: CacheDomain = "general",
  ttlMs?: number,
): Promise<T> {
  const cached = appCache.get<T>(key);
  if (cached !== null) return Promise.resolve(cached);

  return fetcher().then((value) => {
    appCache.set(key, value, domain, ttlMs);
    return value;
  });
}

export function cacheKey(...parts: (string | number | undefined)[]): string {
  return parts.filter((p) => p !== undefined).join(":");
}

export function invalidateOnMutation(domain: CacheDomain, key?: string): void {
  if (key) {
    appCache.delete(key);
  } else {
    appCache.invalidateDomain(domain);
  }
}

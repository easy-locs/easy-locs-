/**
 * cache-validator — Atomic runtime unit: detects stale or mismatched cache entries.
 * Single responsibility: cache freshness tracking.
 */

interface CacheEntry {
  key: string;
  module: string;
  setAt: string;
  lastAccessAt: string;
  ttlMs: number;
  hits: number;
}

const entries = new Map<string, CacheEntry>();
const listeners = new Set<() => void>();

function notify() { listeners.forEach(fn => fn()); }

export function registerCacheEntry(key: string, module: string, ttlMs = 300_000) {
  entries.set(key, {
    key, module, setAt: new Date().toISOString(),
    lastAccessAt: new Date().toISOString(),
    ttlMs, hits: 0,
  });
  notify();
}

export function recordCacheHit(key: string) {
  const e = entries.get(key);
  if (e) {
    e.hits++;
    e.lastAccessAt = new Date().toISOString();
    notify();
  }
}

export function invalidateCache(key: string) {
  entries.delete(key);
  notify();
}

export function getStaleEntries(): CacheEntry[] {
  const now = Date.now();
  return Array.from(entries.values()).filter(e => {
    const age = now - new Date(e.setAt).getTime();
    return age > e.ttlMs;
  });
}

export function getAllCacheEntries(): CacheEntry[] {
  return Array.from(entries.values());
}

export function subscribeCacheValidator(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

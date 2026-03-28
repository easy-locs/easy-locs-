/**
 * stale-cache-detector — Atomic unit: periodic scan for stale cache entries.
 * Single responsibility: detect and report caches that exceeded their TTL.
 */
import { getStaleEntries, getAllCacheEntries } from "./cache-validator";
import { reportAnomaly } from "./anomaly-detector";

export interface StaleCacheReport {
  totalEntries: number;
  staleEntries: number;
  staleKeys: string[];
  staleDomains: string[];
}

export function scanForStaleCache(): StaleCacheReport {
  const all = getAllCacheEntries();
  const stale = getStaleEntries();

  if (stale.length > 0) {
    const domains = [...new Set(stale.map(e => e.module))];
    reportAnomaly("cache", "warning", `${stale.length} stale cache entries`, {
      staleKeys: stale.map(e => e.key),
      domains,
    });
  }

  return {
    totalEntries: all.length,
    staleEntries: stale.length,
    staleKeys: stale.map(e => e.key),
    staleDomains: [...new Set(stale.map(e => e.module))],
  };
}

let scanTimer: ReturnType<typeof setInterval> | null = null;

export function startStaleCacheScanner(intervalMs = 60_000): () => void {
  if (scanTimer) return () => {};
  scanTimer = setInterval(() => scanForStaleCache(), intervalMs);
  return () => {
    if (scanTimer) {
      clearInterval(scanTimer);
      scanTimer = null;
    }
  };
}

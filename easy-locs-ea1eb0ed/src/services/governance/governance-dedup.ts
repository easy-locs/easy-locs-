import type { GovernanceViolation } from "@/domains/shared/canonical-types";

const DEDUP_WINDOW_MS = 5_000;
const MAX_CACHE_SIZE = 2_000;

const recentKeys = new Map<string, number>();

let cleanupTimer: ReturnType<typeof setInterval> | null = null;

function ensureCleanup() {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    const cutoff = Date.now() - DEDUP_WINDOW_MS * 2;
    for (const [key, ts] of recentKeys) {
      if (ts < cutoff) recentKeys.delete(key);
    }
    if (recentKeys.size === 0 && cleanupTimer) {
      clearInterval(cleanupTimer);
      cleanupTimer = null;
    }
  }, 10_000);
}

export function computeDedupKey(v: Pick<GovernanceViolation, "type" | "source" | "target" | "severity">): string {
  return `${v.type}:${v.source}:${v.target}:${v.severity}`;
}

export function isDuplicateViolation(dedupKey: string): boolean {
  const now = Date.now();
  const prev = recentKeys.get(dedupKey);
  if (prev && now - prev < DEDUP_WINDOW_MS) {
    return true;
  }
  if (recentKeys.size >= MAX_CACHE_SIZE) {
    const cutoff = now - DEDUP_WINDOW_MS;
    for (const [key, ts] of recentKeys) {
      if (ts < cutoff) recentKeys.delete(key);
      if (recentKeys.size < MAX_CACHE_SIZE * 0.8) break;
    }
  }
  recentKeys.set(dedupKey, now);
  ensureCleanup();
  return false;
}

export function markViolationSeen(dedupKey: string): void {
  recentKeys.set(dedupKey, Date.now());
  ensureCleanup();
}

export function getDedupCacheSize(): number {
  return recentKeys.size;
}

export function clearDedupCache(): void {
  recentKeys.clear();
}

let pageOpenCounter = 0;
const activePageDedupKeys = new Set<string>();

export function createPageOpenDedupKey(route: string): { key: string; pageId: string; isDuplicate: boolean } {
  const key = `pageopen:${route}`;
  if (activePageDedupKeys.has(key)) {
    return { key, pageId: `page-dup-${++pageOpenCounter}`, isDuplicate: true };
  }
  activePageDedupKeys.add(key);
  setTimeout(() => activePageDedupKeys.delete(key), 500);
  return { key, pageId: `page-${++pageOpenCounter}`, isDuplicate: false };
}

const clickGuardKeys = new Map<string, number>();
const CLICK_DEDUP_MS = 1_000;

export function isClickDuplicate(actionKey: string): boolean {
  const now = Date.now();
  const prev = clickGuardKeys.get(actionKey);
  if (prev && now - prev < CLICK_DEDUP_MS) return true;
  clickGuardKeys.set(actionKey, now);
  if (clickGuardKeys.size > 500) {
    const cutoff = now - CLICK_DEDUP_MS * 2;
    for (const [k, t] of clickGuardKeys) {
      if (t < cutoff) clickGuardKeys.delete(k);
    }
  }
  return false;
}

/**
 * Sync Engine — Deduplication unit.
 */
const DEDUPE_WINDOW_MS = 10_000;
const recentDispatches = new Map<string, number>();

export function buildDedupeKey(type: string, orgId: string, targetId: string, actorKey: string): string {
  return `${type}:${orgId}:${targetId}:${actorKey}`;
}

export function isDuplicate(key: string): boolean {
  const lastTime = recentDispatches.get(key);
  if (lastTime && Date.now() - lastTime < DEDUPE_WINDOW_MS) {
    return true;
  }
  if (recentDispatches.size > 200) {
    const cutoff = Date.now() - DEDUPE_WINDOW_MS;
    for (const [k, v] of recentDispatches) {
      if (v < cutoff) recentDispatches.delete(k);
    }
  }
  recentDispatches.set(key, Date.now());
  return false;
}

/**
 * Time Cache — Cached timestamp formatting for hot-path performance.
 * Avoids re-formatting the same ISO timestamps every render cycle.
 */

const formatCache = new Map<string, string>();
const MAX_CACHE_SIZE = 500;

function pruneIfNeeded() {
  if (formatCache.size > MAX_CACHE_SIZE) {
    // Remove oldest half
    const keys = Array.from(formatCache.keys());
    for (let i = 0; i < keys.length / 2; i++) {
      formatCache.delete(keys[i]);
    }
  }
}

/** Cache-aware relative time formatter */
export function cachedRelativeTime(iso: string, locale = "en"): string {
  const key = `rel:${iso}:${locale}`;
  const cached = formatCache.get(key);
  if (cached) return cached;

  const date = new Date(iso);
  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  let result: string;
  if (diffMin < 1) result = "now";
  else if (diffMin < 60) result = `${diffMin}m`;
  else if (diffMin < 1440) result = `${Math.floor(diffMin / 60)}h`;
  else if (diffMin < 10080) result = `${Math.floor(diffMin / 1440)}d`;
  else result = date.toLocaleDateString(locale, { month: "short", day: "numeric" });

  pruneIfNeeded();
  formatCache.set(key, result);
  return result;
}

/** Cache-aware time-only formatter (HH:MM) */
export function cachedTimeFormat(iso: string, locale = "en"): string {
  const key = `time:${iso}:${locale}`;
  const cached = formatCache.get(key);
  if (cached) return cached;

  const result = new Date(iso).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
  pruneIfNeeded();
  formatCache.set(key, result);
  return result;
}

/** Clear format cache (e.g. on locale change) */
export function clearTimeCache() {
  formatCache.clear();
}

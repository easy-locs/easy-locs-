/**
 * Time Synchronization — Corrects client clock drift against server time.
 * Ensures message ordering is consistent across devices.
 */

let clockOffsetMs = 0;
let lastSyncAt = 0;
const SYNC_INTERVAL_MS = 5 * 60 * 1000; // Re-sync every 5 minutes

/**
 * Sync client clock against server.
 * Uses Supabase server time via a lightweight query.
 */
export async function syncClock(): Promise<number> {
  try {
    const clientBefore = Date.now();
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/rpc/now`, {
      method: "POST",
      headers: {
        "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        "Content-Type": "application/json",
      },
      body: "{}",
    });
    const clientAfter = Date.now();
    const rtt = clientAfter - clientBefore;

    if (res.ok) {
      const serverTime = new Date(await res.text().then(t => t.replace(/"/g, ""))).getTime();
      const clientMid = clientBefore + rtt / 2;
      clockOffsetMs = serverTime - clientMid;
      lastSyncAt = Date.now();
    }
  } catch {
    // Non-fatal: keep using last known offset
  }
  return clockOffsetMs;
}

/**
 * Get corrected timestamp (client time + server offset).
 */
export function getCorrectedTimestamp(): number {
  return Date.now() + clockOffsetMs;
}

/**
 * Get corrected ISO string for DB writes.
 */
export function getCorrectedISOString(): string {
  return new Date(getCorrectedTimestamp()).toISOString();
}

/**
 * Get current clock offset in ms (positive = client ahead, negative = behind).
 */
export function getClockOffset(): number {
  return clockOffsetMs;
}

/**
 * Check if clock needs re-sync.
 */
export function needsResync(): boolean {
  return Date.now() - lastSyncAt > SYNC_INTERVAL_MS;
}

/**
 * Start periodic clock sync.
 */
export function startClockSync(intervalMs = SYNC_INTERVAL_MS): () => void {
  syncClock(); // Initial sync
  const timer = setInterval(() => syncClock(), intervalMs);
  return () => clearInterval(timer);
}

/**
 * Send Guards — Prevent invalid/duplicate sends.
 * Anti double-tap, anti double-submit, anti spam.
 */

const SUBMIT_LOCK_TTL = 650; // ms
const CONTENT_DEDUP_TTL = 1200; // ms

const submitLocks = new Map<string, number>();
const contentHashes = new Map<string, number>();

/**
 * Check and acquire submit lock for a conversation.
 * Returns true if lock acquired (send allowed).
 */
export function acquireSubmitLock(conversationId: string): boolean {
  const now = Date.now();
  const last = submitLocks.get(conversationId) || 0;
  if (now - last < SUBMIT_LOCK_TTL) return false;
  submitLocks.set(conversationId, now);
  return true;
}

/**
 * Check content dedup — prevent identical content within window.
 */
export function isContentDuplicate(
  conversationId: string,
  content: string,
): boolean {
  const key = `${conversationId}::${content.trim().slice(0, 100)}`;
  const now = Date.now();
  const last = contentHashes.get(key) || 0;
  if (now - last < CONTENT_DEDUP_TTL) return true;
  contentHashes.set(key, now);

  // Cleanup old entries periodically
  if (contentHashes.size > 500) {
    const cutoff = now - CONTENT_DEDUP_TTL * 2;
    for (const [k, ts] of contentHashes) {
      if (ts < cutoff) contentHashes.delete(k);
    }
  }

  return false;
}

/**
 * Release submit lock (e.g., after failure).
 */
export function releaseSubmitLock(conversationId: string): void {
  submitLocks.delete(conversationId);
}

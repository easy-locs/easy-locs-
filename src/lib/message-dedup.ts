/**
 * Message dedup engine — prevents duplicate sends and realtime echo duplication.
 */

const pendingNonces = new Set<string>();
const seenMessageIds = new Set<string>();
const MAX_SEEN = 500;

/** Generate a unique client nonce for outgoing messages */
export function generateMessageNonce(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Mark a nonce as pending (send in progress) */
export function markSending(nonce: string) {
  pendingNonces.add(nonce);
}

/** Clear pending nonce after ack */
export function markAcked(nonce: string) {
  pendingNonces.delete(nonce);
  console.debug("[msg-dedup] message_send_acked", { nonce });
}

/** Check if a send is already in flight for same content */
export function isSending(): boolean {
  return pendingNonces.size > 0;
}

/** Deduplicate incoming realtime messages */
export function isSeenMessage(id: string): boolean {
  if (seenMessageIds.has(id)) {
    console.debug("[msg-dedup] message_deduped_realtime", { id });
    return true;
  }
  seenMessageIds.add(id);
  // Evict oldest
  if (seenMessageIds.size > MAX_SEEN) {
    const first = seenMessageIds.values().next().value;
    if (first) seenMessageIds.delete(first);
  }
  return false;
}

/** Reset on thread change */
export function resetDedup() {
  pendingNonces.clear();
  seenMessageIds.clear();
}

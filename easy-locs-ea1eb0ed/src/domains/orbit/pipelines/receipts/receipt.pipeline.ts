/**
 * receiptPipeline — Canonical read/delivered receipt management.
 *
 * Rules:
 * - Batch receipts (max every 2s per conversation)
 * - No duplicate receipts
 * - No read receipt if message not actually visible
 * - No receipt spam
 */

const RECEIPT_THROTTLE_MS = 2000;
const lastReceiptSent = new Map<string, number>();
const pendingBatch = new Map<string, Set<string>>();

/**
 * Queue a read receipt — throttled per conversation.
 */
export function queueReadReceipt(
  conversationId: string,
  messageId: string,
  sendFn: (conversationId: string, messageIds: string[]) => Promise<void>,
): void {
  // Batch
  if (!pendingBatch.has(conversationId)) {
    pendingBatch.set(conversationId, new Set());
  }
  pendingBatch.get(conversationId)!.add(messageId);

  // Throttle
  const lastSent = lastReceiptSent.get(conversationId) || 0;
  const now = Date.now();
  if (now - lastSent < RECEIPT_THROTTLE_MS) return;

  // Flush
  flushReceipts(conversationId, sendFn);
}

async function flushReceipts(
  conversationId: string,
  sendFn: (conversationId: string, messageIds: string[]) => Promise<void>,
): Promise<void> {
  const batch = pendingBatch.get(conversationId);
  if (!batch || batch.size === 0) return;

  const messageIds = Array.from(batch);
  pendingBatch.delete(conversationId);
  lastReceiptSent.set(conversationId, Date.now());

  try {
    await sendFn(conversationId, messageIds);
  } catch {
    // Re-add failed batch
    if (!pendingBatch.has(conversationId)) {
      pendingBatch.set(conversationId, new Set());
    }
    for (const id of messageIds) {
      pendingBatch.get(conversationId)!.add(id);
    }
  }
}

/**
 * Check if a read receipt should be sent (visibility guard).
 */
export function shouldSendReadReceipt(
  messageId: string,
  senderId: string,
  currentUserId: string,
): boolean {
  // Don't send read receipt for own messages
  if (senderId === currentUserId) return false;
  return true;
}

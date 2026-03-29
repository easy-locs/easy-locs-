/**
 * send.reconcile — Canonical optimistic → confirmed reconciliation.
 * Deduplicates against realtime payloads and handles failed send recovery.
 */

export interface OptimisticMessage {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  pending?: boolean;
  failed?: boolean;
}

export interface ConfirmedMessage {
  id: string;
  body: string;
  sender_user_id: string;
  created_at: string;
}

/**
 * Reconcile an optimistic message with a confirmed DB row.
 * Returns the updated message list with the optimistic entry replaced.
 */
export function reconcileOptimistic(
  messages: OptimisticMessage[],
  optimisticId: string,
  confirmed: ConfirmedMessage,
): OptimisticMessage[] {
  return messages.map((m) =>
    m.id === optimisticId
      ? { ...m, id: confirmed.id, created_at: confirmed.created_at, pending: false, failed: false }
      : m,
  );
}

/**
 * Mark an optimistic message as failed (for retry).
 */
export function markOptimisticFailed(
  messages: OptimisticMessage[],
  optimisticId: string,
): OptimisticMessage[] {
  return messages.map((m) =>
    m.id === optimisticId ? { ...m, pending: false, failed: true } : m,
  );
}

/**
 * Remove a pending message (e.g. on cancel).
 */
export function removeOptimistic(
  messages: OptimisticMessage[],
  optimisticId: string,
): OptimisticMessage[] {
  return messages.filter((m) => m.id !== optimisticId);
}

/**
 * Deduplicate: if a realtime payload matches an existing confirmed ID, skip it.
 * If it matches an optimistic ID prefix pattern, reconcile instead.
 */
export function deduplicateRealtimeMessage(
  messages: OptimisticMessage[],
  incoming: ConfirmedMessage,
): { messages: OptimisticMessage[]; isDuplicate: boolean } {
  // Already exists by confirmed ID
  if (messages.some((m) => m.id === incoming.id)) {
    return { messages, isDuplicate: true };
  }

  // Check if this matches a pending optimistic by sender + content + time proximity
  const matchIdx = messages.findIndex(
    (m) =>
      m.pending &&
      m.sender_id === incoming.sender_user_id &&
      m.content === incoming.body &&
      Math.abs(new Date(m.created_at).getTime() - new Date(incoming.created_at).getTime()) < 10000,
  );

  if (matchIdx >= 0) {
    const updated = [...messages];
    updated[matchIdx] = {
      ...updated[matchIdx],
      id: incoming.id,
      created_at: incoming.created_at,
      pending: false,
      failed: false,
    };
    return { messages: updated, isDuplicate: false };
  }

  return { messages, isDuplicate: false };
}

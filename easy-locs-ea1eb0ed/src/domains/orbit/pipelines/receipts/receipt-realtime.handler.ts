/**
 * receipt-realtime.handler — SINGLE entry for all realtime receipt events.
 *
 * RULE: No component/hook/listener may set status=delivered or status=read directly.
 * ALL receipt updates MUST flow through this handler → status machine → orbitStore.
 *
 * FLOW: realtime event → normalizeReceiptEvent → cross-conversation guard → resolveNextStatus → updateMessageStatus → MessageStatusBadge
 */
import { useOrbitMessagingStore } from "@/domains/orbit/stores/orbit.store";
import { resolveNextStatus } from "@/domains/orbit/pipelines/message/message-status.machine";
import type { MessageStatus } from "@/domains/orbit/types";

// ══════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════

export type ReceiptType = "delivered" | "read";

export interface NormalizedReceipt {
  messageId: string;
  conversationId: string;
  receiptType: ReceiptType;
  actorUserId: string | null;
  createdAt: string;
  source: string;
}

// ══════════════════════════════════════════════
// NORMALIZER — exported for external use, no side effects
// ══════════════════════════════════════════════

/**
 * Normalize a raw realtime receipt event into canonical shape.
 * Returns null if essential fields are missing (event is dropped + logged in DEV).
 *
 * Handles all legacy formats:
 * - { message_id, conversation_id, read_at } (DB UPDATE payload)
 * - { messageId, conversationId, receipt_type } (normalized event)
 * - { id, conversation_id, delivered_at } (raw row)
 */
export function normalizeReceiptEvent(raw: any): NormalizedReceipt | null {
  const messageId = raw?.message_id || raw?.messageId || raw?.id;
  const conversationId = raw?.conversation_id || raw?.conversationId;

  // Hard fail: no messageId
  if (!messageId) {
    if (import.meta.env.DEV) {
      console.warn("[receiptNormalizer] DROPPED — missing messageId", raw);
    }
    return null;
  }

  // Hard fail: no conversationId
  if (!conversationId) {
    if (import.meta.env.DEV) {
      console.warn("[receiptNormalizer] DROPPED — missing conversationId", raw);
    }
    return null;
  }

  // Determine receipt type from event shape
  let receiptType: ReceiptType = "delivered";
  if (raw.read_at || raw.readAt || raw.receipt_type === "read" || raw.status === "read") {
    receiptType = "read";
  } else if (raw.delivered_at || raw.deliveredAt || raw.receipt_type === "delivered" || raw.status === "delivered") {
    receiptType = "delivered";
  }

  return {
    messageId,
    conversationId,
    receiptType,
    actorUserId: raw.actor_user_id || raw.actorUserId || raw.user_id || raw.sender_user_id || null,
    createdAt: raw.created_at || raw.createdAt || new Date().toISOString(),
    source: raw._source || "realtime",
  };
}

// ══════════════════════════════════════════════
// HANDLER — single entry, all guards enforced
// ══════════════════════════════════════════════

/**
 * Handle a realtime receipt event through the canonical status machine.
 * This is the ONLY function that should process delivered/read events.
 *
 * Guards:
 * 1. Normalize (drop if invalid)
 * 2. Message must exist in store
 * 3. Cross-conversation guard: receipt.conversationId must match message.conversationId
 * 4. Status machine: resolveNextStatus decides if transition is legal
 * 5. Apply via orbitStore.updateMessageStatus (which has its own machine guard)
 */
export function handleRealtimeReceipt(rawEvent: any): void {
  // Step 1: Normalize
  const receipt = normalizeReceiptEvent(rawEvent);
  if (!receipt) return;

  if (import.meta.env.DEV) {
    console.debug("[receiptHandler] receipt_event_received", {
      type: receipt.receiptType,
      messageId: receipt.messageId,
      source: receipt.source,
    });
  }

  // Step 2: Lookup current message in owner
  const store = useOrbitMessagingStore.getState();
  const msg = store.messages[receipt.messageId];

  if (!msg) {
    if (import.meta.env.DEV) {
      console.debug("[receiptHandler] receipt_message_missing", {
        messageId: receipt.messageId,
        conversationId: receipt.conversationId,
      });
    }
    return;
  }

  // Step 3: Cross-conversation guard — prevent receipt leaking to wrong conversation
  if (msg.conversationId !== receipt.conversationId) {
    if (import.meta.env.DEV) {
      console.error("[receiptHandler] receipt_cross_conversation_blocked", {
        messageId: receipt.messageId,
        receiptConversation: receipt.conversationId,
        messageConversation: msg.conversationId,
      });
    }
    return;
  }

  // Step 4: Map receipt type to requested status
  const requestedStatus: MessageStatus = receipt.receiptType;

  // Step 5: Validate transition through status machine
  const nextStatus = resolveNextStatus(msg.status, requestedStatus);

  if (nextStatus === null) {
    if (import.meta.env.DEV) {
      console.debug("[receiptHandler] receipt_transition_blocked", {
        messageId: receipt.messageId,
        from: msg.status,
        requested: requestedStatus,
      });
    }
    return;
  }

  // Step 6: Apply through canonical store method
  if (import.meta.env.DEV) {
    console.debug("[receiptHandler] receipt_transition_applied", {
      messageId: receipt.messageId,
      from: msg.status,
      to: nextStatus,
      receiptType: receipt.receiptType,
    });
  }

  store.updateMessageStatus(receipt.messageId, nextStatus);
}

/**
 * Handle a batch of receipt events (e.g., mark-all-read from server).
 */
export function handleRealtimeReceiptBatch(rawEvents: any[]): void {
  for (const event of rawEvents) {
    handleRealtimeReceipt(event);
  }
}

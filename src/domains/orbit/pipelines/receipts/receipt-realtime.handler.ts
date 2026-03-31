/**
 * receipt-realtime.handler — SINGLE entry for all realtime receipt events.
 *
 * RULE: No component/hook/listener may set status=delivered or status=read directly.
 * ALL receipt updates MUST flow through this handler → status machine → orbitStore.
 *
 * FLOW: realtime event → normalizeReceiptEvent → resolveNextStatus → updateMessageStatus → selector → MessageStatusBadge
 */
import { useOrbitStore } from "@/domains/orbit/stores/orbit.store";
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
// NORMALIZER
// ══════════════════════════════════════════════

/**
 * Normalize a raw realtime receipt event into canonical shape.
 * Returns null if essential fields are missing (event is dropped).
 */
export function normalizeReceiptEvent(raw: any): NormalizedReceipt | null {
  const messageId = raw?.message_id || raw?.messageId || raw?.id;
  const conversationId = raw?.conversation_id || raw?.conversationId;

  if (!messageId || !conversationId) {
    if (import.meta.env.DEV) {
      console.warn("[receiptHandler] DROPPED — missing messageId or conversationId", raw);
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
    actorUserId: raw.actor_user_id || raw.actorUserId || raw.user_id || null,
    createdAt: raw.created_at || raw.createdAt || new Date().toISOString(),
    source: raw._source || "realtime",
  };
}

// ══════════════════════════════════════════════
// HANDLER
// ══════════════════════════════════════════════

/**
 * Handle a realtime receipt event through the canonical status machine.
 * This is the ONLY function that should process delivered/read events.
 */
export function handleRealtimeReceipt(rawEvent: any): void {
  // Step 1: Normalize
  const receipt = normalizeReceiptEvent(rawEvent);
  if (!receipt) return;

  if (import.meta.env.DEV) {
    console.debug("[receiptHandler] normalized_receipt", receipt);
  }

  // Step 2: Lookup current message
  const store = useOrbitStore.getState();
  const msg = store.messages[receipt.messageId];

  if (!msg) {
    if (import.meta.env.DEV) {
      console.debug("[receiptHandler] message_not_in_store", { messageId: receipt.messageId });
    }
    return;
  }

  // Step 3: Map receipt type to requested status
  const requestedStatus: MessageStatus = receipt.receiptType;

  // Step 4: Validate transition through status machine
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

  // Step 5: Apply through canonical store method (which has its own machine guard)
  if (import.meta.env.DEV) {
    console.debug("[receiptHandler] receipt_transition_applied", {
      messageId: receipt.messageId,
      from: msg.status,
      to: nextStatus,
    });
  }

  store.updateMessageStatus(receipt.messageId, nextStatus);
}

/**
 * Handle a batch of receipt events (e.g., mark-all-read).
 */
export function handleRealtimeReceiptBatch(rawEvents: any[]): void {
  for (const event of rawEvents) {
    handleRealtimeReceipt(event);
  }
}

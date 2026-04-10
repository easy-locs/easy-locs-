/**
 * orbitRealtimeOwner — SINGLE realtime owner for the Orbit chat domain.
 * 
 * Rules:
 * - One subscription for messages per conversation
 * - One subscription for conversation updates per user
 * - All events pass through: normalize → dedup → merge into orbitStore
 * - Receipt events (delivered_at/read_at updates) route through canonical receipt handler
 * - No raw data leaks to consumers
 */
import { createRealtimeChannel, removeRealtimeChannel } from "@/lib/realtime";
import { normalizeOrbitMessage, normalizeConversation } from "@/domains/orbit/normalizers";
import { isMessageDuplicate, markMessageSeen } from "@/lib/dedup/message-dedup";
import { useOrbitMessagingStore } from "@/domains/orbit/stores/orbit.store";
import { handleRealtimeReceipt } from "@/domains/orbit/pipelines/receipts/receipt-realtime.handler";
import {
  logRealtimeEventReceived,
  logRealtimeEventDeduped,
  logMessageReconciled,
} from "@/lib/observability/orbit-observability";
import { decryptMessageBody } from "@/stores/orbit/crypto.bridge";
import type { RatchetMessage } from "@/lib/orbit-double-ratchet";

const activeChannels = new Map<string, any>();

// ══════════════════════════════════════════════
// RECEIPT-ONLY UPDATE DETECTION
// ══════════════════════════════════════════════

/** Fields that indicate a receipt-only update (no business content change) */
const RECEIPT_FIELDS = ["delivered_at", "read_at", "status"];
const CONTENT_FIELDS = [
  "body", "type", "attachment_url", "metadata",
  "edited_at", "edited_body", "reply_to_message_id",
  "deleted_for_all", "deleted_for_sender", "deleted_at",
  "starred", "pinned_at",
];

/**
 * Detect if a realtime UPDATE only changed receipt-related fields.
 * If true, the update must route exclusively through the receipt handler.
 */
function isReceiptOnlyUpdate(oldRow: any, newRow: any): boolean {
  if (!oldRow || !newRow) return false;

  // Check if any receipt field actually changed
  const hasReceiptChange = RECEIPT_FIELDS.some(
    (f) => oldRow[f] !== newRow[f]
  );
  if (!hasReceiptChange) return false;

  // Check if any content field also changed — if so, it's a mixed update
  const hasContentChange = CONTENT_FIELDS.some(
    (f) => oldRow[f] !== newRow[f]
  );

  return !hasContentChange;
}

// ══════════════════════════════════════════════
// MESSAGE SUBSCRIPTION (per conversation)
// ══════════════════════════════════════════════

export function subscribeConversationMessages(conversationId: string): () => void {
  const key = `orbit:msgs:${conversationId}`;
  unsubscribeKey(key);

  const channel = createRealtimeChannel(key)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "chat_messages_v2",
        filter: `conversation_id=eq.${conversationId}`,
      },
      async (payload) => {
        const raw = payload.new;
        if (!raw?.id) return;

        // Layer 1: Dedup
        const { isDuplicate } = isMessageDuplicate({ id: raw.id });
        if (isDuplicate) {
          logRealtimeEventDeduped(raw.id, "already_seen");
          return;
        }

        // Layer 2: Normalize
        const normalized = normalizeOrbitMessage(raw);

        // Layer 3: Mark seen
        markMessageSeen({ id: normalized.id, tempId: normalized.tempId });

        // Layer 4: Check if this is a reconciliation
        const store = useOrbitMessagingStore.getState();
        if (normalized.tempId && store.tempIdMap[normalized.tempId]) {
          return;
        }

        if (normalized.tempId) {
          const existingTemp = store.messages[normalized.tempId];
          if (existingTemp) {
            store.reconcileMessage(normalized.tempId, normalized);
            logMessageReconciled(normalized.tempId, normalized.id);
            return;
          }
        }

        // Layer 5: E2EE decrypt (only for messages explicitly marked e2ee)
        let final = normalized;
        if (normalized.metadata?.e2ee && normalized.body) {
          try {
            const ratchetMsg: RatchetMessage = JSON.parse(normalized.body);
            if (ratchetMsg.v === 3 && ratchetMsg.h && ratchetMsg.ct) {
              const plaintext = await decryptMessageBody(conversationId, ratchetMsg);
              final = { ...normalized, body: plaintext };
            }
          } catch {
            final = { ...normalized, body: "\u{1F512} Encrypted message", metadata: { ...normalized.metadata, e2ee_pending: true } };
          }
        }

        // Layer 6: Merge into store
        store.mergeMessage(final);
        logRealtimeEventReceived("chat_messages_v2", "INSERT", final.id);
      }
    )
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "chat_messages_v2",
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => {
        const raw = payload.new;
        if (!raw?.id) return;

        // ══ RECEIPT-ONLY UPDATE DETECTION ══
        // If this update ONLY changes delivered_at/read_at,
        // route exclusively through the receipt handler → status machine.
        // Do NOT also merge the full message (would bypass the machine).
        if (isReceiptOnlyUpdate(payload.old, raw)) {
          if (import.meta.env.DEV) {
            console.debug("[orbitRealtime] receipt_only_update_routed", { id: raw.id });
          }
          handleRealtimeReceipt(raw);
          return; // ← CRITICAL: stop here, no mergeMessage
        }

        // ══ MIXED UPDATE (receipt + other fields) ══
        // Route receipt through handler first, then merge non-status fields.
        if (raw.delivered_at || raw.read_at) {
          handleRealtimeReceipt(raw);
          if (import.meta.env.DEV) {
            console.debug("[orbitRealtime] mixed_update_receipt_handled", { id: raw.id });
          }
        }

        // Merge the full message but preserve status if receipt was just applied
        const normalized = normalizeOrbitMessage(raw);

        // Guard: strip status from normalized if receipt handler already applied it
        // to prevent mergeMessage from overwriting the machine-decided status
        if (raw.delivered_at || raw.read_at) {
          const store = useOrbitMessagingStore.getState();
          const existing = store.messages[normalized.id];
          if (existing) {
            // Keep the status that the receipt handler just set via the machine
            normalized.status = existing.status;
            if (import.meta.env.DEV) {
              console.debug("[orbitRealtime] status_preserved_after_receipt", {
                id: normalized.id, preservedStatus: existing.status,
              });
            }
          }
        }

        useOrbitMessagingStore.getState().mergeMessage(normalized);
      }
    )
    .subscribe();

  activeChannels.set(key, channel);
  return () => unsubscribeKey(key);
}

// ══════════════════════════════════════════════
// CONVERSATION LIST SUBSCRIPTION (per user orbit)
// ══════════════════════════════════════════════

export function subscribeUserConversations(orbitId: string): () => void {
  const key = `orbit:convos:${orbitId}`;
  unsubscribeKey(key);

  const channel = createRealtimeChannel(key)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "conversations_v2",
        filter: `orbit_id=eq.${orbitId}`,
      },
      (payload) => {
        const raw = (payload.new ?? payload.old) as any;
        if (!raw?.id) return;

        if (raw.orbit_id && raw.orbit_id !== orbitId) return;

        const normalized = normalizeConversation(raw);
        useOrbitMessagingStore.getState().mergeConversation(normalized);
        logRealtimeEventReceived("conversations_v2", "UPDATE", normalized.id);
      }
    )
    .subscribe();

  activeChannels.set(key, channel);
  return () => unsubscribeKey(key);
}

// ══════════════════════════════════════════════
// CLEANUP
// ══════════════════════════════════════════════

function unsubscribeKey(key: string) {
  const existing = activeChannels.get(key);
  if (existing) {
    removeRealtimeChannel(existing);
    activeChannels.delete(key);
  }
}

export function unsubscribeAllOrbitRealtime() {
  for (const [key] of activeChannels) {
    unsubscribeKey(key);
  }
}

export function getOrbitRealtimeCount(): number {
  return activeChannels.size;
}

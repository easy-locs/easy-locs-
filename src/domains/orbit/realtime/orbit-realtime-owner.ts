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
import { useOrbitStore } from "@/domains/orbit/stores/orbit.store";
import { handleRealtimeReceipt } from "@/domains/orbit/pipelines/receipts/receipt-realtime.handler";
import {
  logRealtimeEventReceived,
  logRealtimeEventDeduped,
  logMessageReconciled,
} from "@/lib/observability/orbit-observability";

const activeChannels = new Map<string, any>();

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
      (payload) => {
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
        const store = useOrbitStore.getState();
        if (normalized.tempId && store.tempIdMap[normalized.tempId]) {
          return;
        }

        // Check tempId reconciliation needed
        if (normalized.tempId) {
          const existingTemp = store.messages[normalized.tempId];
          if (existingTemp) {
            store.reconcileMessage(normalized.tempId, normalized);
            logMessageReconciled(normalized.tempId, normalized.id);
            return;
          }
        }

        // Layer 5: Merge into store
        store.mergeMessage(normalized);
        logRealtimeEventReceived("chat_messages_v2", "INSERT", normalized.id);
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
          const store = useOrbitStore.getState();
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

        useOrbitStore.getState().mergeMessage(normalized);
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
      },
      (payload) => {
        const raw = (payload.new ?? payload.old) as any;
        if (!raw?.id) return;

        const normalized = normalizeConversation(raw);
        useOrbitStore.getState().mergeConversation(normalized);
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

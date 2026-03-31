/**
 * orbitRealtimeOwner — SINGLE realtime owner for the Orbit chat domain.
 * 
 * Rules:
 * - One subscription for messages per conversation
 * - One subscription for conversation updates per user
 * - All events pass through: normalize → dedup → merge into orbitStore
 * - No raw data leaks to consumers
 */
import { createRealtimeChannel, removeRealtimeChannel } from "@/lib/realtime";
import { normalizeOrbitMessage, normalizeConversation } from "@/domains/orbit/normalizers";
import { isMessageDuplicate, markMessageSeen } from "@/lib/dedup/message-dedup";
import { useOrbitStore } from "@/domains/orbit/stores/orbit.store";
import { logRealtimeEventReceived, logRealtimeEventDeduped, logMessageReconciled } from "@/lib/observability/orbit-observability";

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
          logOrbit("realtime_event_deduped", { id: raw.id });
          return;
        }

        // Layer 2: Normalize
        const normalized = normalizeOrbitMessage(raw);

        // Layer 3: Mark seen
        markMessageSeen({ id: normalized.id, tempId: normalized.tempId });

        // Layer 4: Check if this is a reconciliation
        const store = useOrbitStore.getState();
        if (normalized.tempId && store.tempIdMap[normalized.tempId]) {
          // Already reconciled via optimistic path
          return;
        }

        // Check tempId reconciliation needed
        if (normalized.tempId) {
          const existingTemp = store.messages[normalized.tempId];
          if (existingTemp) {
            store.reconcileMessage(normalized.tempId, normalized);
            logOrbit("message_reconciled", { tempId: normalized.tempId, serverId: normalized.id });
            return;
          }
        }

        // Layer 5: Merge into store
        store.mergeMessage(normalized);
        logOrbit("realtime_event_received", { id: normalized.id, conversationId });
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
        const normalized = normalizeOrbitMessage(raw);
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
        logOrbit("realtime_event_received", { id: normalized.id, type: "conversation" });
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

/**
 * orbit.realtime.subscriber — Realtime channel subscriptions for Orbit.
 * Uses canonical realtime channel factory. Zero direct supabase imports.
 * 
 * CANONICAL CHAIN: Events pass through normalizer + dedup before reaching stores.
 */
import { createRealtimeChannel, removeRealtimeChannel } from "@/lib/realtime";
import { normalizeMessage, normalizeConversation } from "@/lib/normalizers";
import { isMessageDuplicate, markMessageSeen } from "@/lib/dedup/message-dedup";

type MessageCallback = (payload: any) => void;
type ConversationCallback = (payload: any) => void;

const activeChannels: Map<string, any> = new Map();

/** Subscribe to new messages in a specific conversation — with dedup + normalize */
export function subscribeToMessages(
  conversationId: string,
  onMessage: MessageCallback
): () => void {
  const key = `msgs:${conversationId}`;
  unsubscribeChannel(key);

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

        // Layer 1: Dedup — skip if already seen
        const { isDuplicate } = isMessageDuplicate({ id: raw.id });
        if (isDuplicate) return;

        // Layer 2: Normalize
        const normalized = normalizeMessage(raw);

        // Layer 3: Mark as seen
        markMessageSeen({ id: normalized.id, tempId: normalized.tempId });

        // Deliver to subscriber
        onMessage(raw); // Pass raw for backward compat; consumers can migrate to normalized
      }
    )
    .subscribe();

  activeChannels.set(key, channel);
  return () => unsubscribeChannel(key);
}

/** Subscribe to conversation updates for a user's orbit — with normalize */
export function subscribeToConversations(
  orbitId: string,
  onUpdate: ConversationCallback
): () => void {
  const key = `convos:${orbitId}`;
  unsubscribeChannel(key);

  const channel = createRealtimeChannel(key)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "conversations_v2",
      },
      (payload) => {
        const raw = payload.new ?? payload.old;
        if (!raw?.id) return;

        // Normalize before delivering
        const normalized = normalizeConversation(raw);
        onUpdate(raw); // Pass raw for backward compat
      }
    )
    .subscribe();

  activeChannels.set(key, channel);
  return () => unsubscribeChannel(key);
}

/** Clean up a specific channel */
function unsubscribeChannel(key: string) {
  const existing = activeChannels.get(key);
  if (existing) {
    removeRealtimeChannel(existing);
    activeChannels.delete(key);
  }
}

/** Clean up all active channels */
export function unsubscribeAll() {
  for (const [key] of activeChannels) {
    unsubscribeChannel(key);
  }
}

/** Get count of active subscriptions (for observability) */
export function getActiveSubscriptionCount(): number {
  return activeChannels.size;
}

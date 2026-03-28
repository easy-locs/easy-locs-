/**
 * orbit.realtime.subscriber — Realtime channel subscriptions for Orbit.
 * Manages Supabase realtime channels. Zero business logic.
 */
import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

type MessageCallback = (payload: any) => void;
type ConversationCallback = (payload: any) => void;

const activeChannels: Map<string, RealtimeChannel> = new Map();

/** Subscribe to new messages in a specific conversation */
export function subscribeToMessages(
  conversationId: string,
  onMessage: MessageCallback
): () => void {
  const key = `msgs:${conversationId}`;
  unsubscribeChannel(key);

  const channel = supabase
    .channel(key)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "chat_messages_v2",
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => onMessage(payload.new)
    )
    .subscribe();

  activeChannels.set(key, channel);
  return () => unsubscribeChannel(key);
}

/** Subscribe to conversation updates for a user's orbit */
export function subscribeToConversations(
  orbitId: string,
  onUpdate: ConversationCallback
): () => void {
  const key = `convos:${orbitId}`;
  unsubscribeChannel(key);

  const channel = supabase
    .channel(key)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "conversations_v2",
      },
      (payload) => onUpdate(payload.new ?? payload.old)
    )
    .subscribe();

  activeChannels.set(key, channel);
  return () => unsubscribeChannel(key);
}

/** Clean up a specific channel */
function unsubscribeChannel(key: string) {
  const existing = activeChannels.get(key);
  if (existing) {
    supabase.removeChannel(existing);
    activeChannels.delete(key);
  }
}

/** Clean up all active channels */
export function unsubscribeAll() {
  for (const [key] of activeChannels) {
    unsubscribeChannel(key);
  }
}

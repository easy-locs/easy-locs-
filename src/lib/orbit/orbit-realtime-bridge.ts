/**
 * orbit-realtime-bridge — Atomic unit: realtime subscriptions for Orbit messaging.
 * Single responsibility: live message and thread updates.
 */
import { supabase } from "@/integrations/supabase/client";
import { registerChannel, recordEvent, unregisterChannel } from "@/lib/runtime/realtime-monitor";
import { platformBus } from "@/lib/shared/platform-bus";
import { APP_EVENTS } from "@/lib/platform/events";
import { reportHealth } from "@/lib/runtime/health-aggregator";

export function subscribeOrbitMessages(conversationId: string, onMessage: (msg: any) => void): () => void {
  const channelName = `orbit-messages-${conversationId}`;
  registerChannel(channelName, "orbit");

  const channel = supabase
    .channel(channelName)
    .on(
      "postgres_changes" as any,
      {
        event: "INSERT",
        schema: "public",
        table: "chat_messages_v2",
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload: any) => {
        recordEvent(channelName);
        reportHealth("orbit", "ok");
        platformBus.emit(APP_EVENTS.ORBIT_MESSAGE_RECEIVED, {
          conversationId,
          messageId: payload.new?.id,
        }, "orbit-realtime");
        onMessage(payload.new);
      }
    )
    .subscribe();

  return () => {
    unregisterChannel(channelName);
    supabase.removeChannel(channel);
  };
}

export function subscribeOrbitThreadUpdates(userId: string, onUpdate: (thread: any) => void): () => void {
  const channelName = `orbit-threads-${userId}`;
  registerChannel(channelName, "orbit");

  const channel = supabase
    .channel(channelName)
    .on(
      "postgres_changes" as any,
      { event: "UPDATE", schema: "public", table: "conversations_v2" },
      (payload: any) => {
        recordEvent(channelName);
        platformBus.emit(APP_EVENTS.ORBIT_THREAD_UPDATED, {
          threadId: payload.new?.id,
        }, "orbit-realtime");
        onUpdate(payload.new);
      }
    )
    .subscribe();

  return () => {
    unregisterChannel(channelName);
    supabase.removeChannel(channel);
  };
}

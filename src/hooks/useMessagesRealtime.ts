import { useEffect } from "react";
import { subscribeTable } from "@/lib/supabase/realtime";
import { useRealtimeStore } from "@/stores/realtimeStore";
import { useChatStore } from "@/stores/chatStore";

export function useMessagesRealtime(conversationId: string | null) {
  useEffect(() => {
    if (!conversationId) return;

    const key = `chat_messages_${conversationId}`;
    const channelName = `chat_messages_${conversationId}`;

    const { unsubscribe, ref } = subscribeTable({
      key,
      channelName,
      table: "chat_messages",
      callback: async (payload: unknown) => {
        const row = (payload as Record<string, unknown>)?.new as Record<string, unknown> | undefined;
        if (!row || row.conversationId !== conversationId) return;
        await useChatStore.getState().hydrateMessages(conversationId);
      },
    });

    useRealtimeStore.getState().addSubscription(ref);

    return () => {
      unsubscribe();
      useRealtimeStore.getState().removeSubscription(ref.key);
    };
  }, [conversationId]);
}

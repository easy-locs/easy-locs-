import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useDebugCommsStore } from "@/stores/debugCommsStore";

export function useConversationRealtime(input: {
  conversationId: string | null;
  onMessage?: (row: any) => void;
  onCall?: (row: any) => void;
}) {
  useEffect(() => {
    if (!input.conversationId) return;

    useDebugCommsStore.getState().setConversation({
      conversationId: input.conversationId,
    });

    const channel = supabase
      .channel(`conversation_rt_${input.conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages_v2",
          filter: `conversation_id=eq.${input.conversationId}`,
        },
        (payload: any) => {
          useDebugCommsStore.getState().setRealtime({ realtimeMessagesReady: true });
          useDebugCommsStore.getState().setLastMessage({
            lastMessageId: payload.new?.id ?? null,
            lastMessageBody: payload.new?.body ?? null,
            lastMessageCreatedAt: payload.new?.created_at ?? null,
          });
          input.onMessage?.(payload.new);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "call_logs",
          filter: `conversation_id=eq.${input.conversationId}`,
        },
        (payload: any) => {
          useDebugCommsStore.getState().setRealtime({ realtimeCallsReady: true });
          useDebugCommsStore.getState().setLastCall({
            lastCallSessionId: payload.new?.id ?? null,
            lastCallStatus: payload.new?.status ?? null,
            lastCallType: payload.new?.call_type ?? null,
          });
          input.onCall?.(payload.new);
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          useDebugCommsStore.getState().setRealtime({
            realtimeMessagesReady: true,
            realtimeCallsReady: true,
          });
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [input.conversationId, input.onMessage, input.onCall]);
}

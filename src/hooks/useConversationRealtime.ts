import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useConversationRealtime(input: {
  conversationId: string | null;
  onMessage?: (row: any) => void;
  onCall?: (row: any) => void;
}) {
  useEffect(() => {
    if (!input.conversationId) return;

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
          input.onCall?.(payload.new);
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [input.conversationId, input.onMessage, input.onCall]);
}

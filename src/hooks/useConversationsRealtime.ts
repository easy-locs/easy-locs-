import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useConversationsRealtime(onConversationChange: () => void) {
  useEffect(() => {
    const channel = supabase
      .channel("conversations_list_rt")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "conversations_v2" },
        () => onConversationChange()
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages_v2" },
        () => onConversationChange()
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [onConversationChange]);
}

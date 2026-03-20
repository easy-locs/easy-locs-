import { supabase } from "@/integrations/supabase/client";
import type { RealtimeSubscriptionRef } from "@/lib/types/realtime";

export function subscribeTable(params: {
  key: string;
  channelName: string;
  table: string;
  event?: "*" | "INSERT" | "UPDATE" | "DELETE";
  callback: (payload: unknown) => void;
}): { unsubscribe: () => void; ref: RealtimeSubscriptionRef } {
  const channel = supabase
    .channel(params.channelName)
    .on(
      "postgres_changes",
      {
        event: params.event ?? "*",
        schema: "public",
        table: params.table,
      },
      (payload) => params.callback(payload)
    )
    .subscribe();

  return {
    unsubscribe: () => {
      void supabase.removeChannel(channel);
    },
    ref: {
      key: params.key,
      channelName: params.channelName,
      active: true,
    },
  };
}

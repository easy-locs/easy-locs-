import { useEffect } from "react";
import { createRealtimeChannel, removeRealtimeChannel } from "@/lib/realtime";
import { useV2AuthStore } from "@/stores/v2AuthStore";
import { useSavedSearchStore } from "@/stores/savedSearchStore";

export function useSavedSearchesRealtime() {
  const user = useV2AuthStore((s) => s.user);

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`saved_searches_${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "saved_searches",
        },
        async (payload: any) => {
          const row = payload?.new ?? payload?.old;
          if (!row || row.user_id !== user.id) return;
          await useSavedSearchStore.getState().hydrate();
        }
      )
      .subscribe();

    return () => {
      void removeRealtimeChannel(channel);
    };
  }, [user?.id]);
}

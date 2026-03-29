import { useEffect } from "react";
import { createRealtimeChannel, removeRealtimeChannel } from "@/lib/realtime";
import { useV2AuthStore } from "@/stores/v2AuthStore";
import { useActivityLogStore } from "@/stores/activityLogStore";

export function useActivityRealtime() {
  const user = useV2AuthStore((s) => s.user);

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`activity_logs_${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "activity_logs",
        },
        async (payload: any) => {
          const row = payload?.new ?? payload?.old;
          if (!row || row.user_id !== user.id) return;
          await useActivityLogStore.getState().hydrate();
        }
      )
      .subscribe();

    return () => {
      void removeRealtimeChannel(channel);
    };
  }, [user?.id]);
}

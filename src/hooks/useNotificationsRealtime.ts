import { useEffect } from "react";
import { subscribeTable } from "@/lib/supabase/realtime";
import { useRealtimeStore } from "@/stores/realtimeStore";
import { useNotificationsStore } from "@/stores/notificationsStore";

export function useNotificationsRealtime(orbitId: string | null) {
  useEffect(() => {
    if (!orbitId) return;

    const { unsubscribe, ref } = subscribeTable({
      key: `notifications_${orbitId}`,
      channelName: `notifications_${orbitId}`,
      table: "app_notifications",
      callback: async (payload: unknown) => {
        const row = (payload as Record<string, unknown>)?.new as Record<string, unknown> | undefined;
        if (!row || row.orbitId !== orbitId) return;
        await useNotificationsStore.getState().hydrate(orbitId);
      },
    });

    useRealtimeStore.getState().addSubscription(ref);

    return () => {
      unsubscribe();
      useRealtimeStore.getState().removeSubscription(ref.key);
    };
  }, [orbitId]);
}

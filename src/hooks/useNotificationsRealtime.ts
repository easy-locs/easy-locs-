import { useEffect } from "react";
import { subscribeTable } from "@/lib/supabase/realtime";
import { useRealtimeStore } from "@/stores/realtimeStore";
import { useOrbitStore } from "@/stores/orbitStore";
import { useNotificationsStore } from "@/stores/notificationsStore";

export function useNotificationsRealtime(orbitId?: string | null) {
  const profileOrbitId = useOrbitStore((s) => s.profile?.orbitId);
  const resolvedOrbitId = orbitId ?? profileOrbitId;

  useEffect(() => {
    if (!resolvedOrbitId) return;

    const { unsubscribe, ref } = subscribeTable({
      key: `notifications_${resolvedOrbitId}`,
      channelName: `notifications_${resolvedOrbitId}`,
      table: "app_notifications",
      callback: async (payload: unknown) => {
        const row = (payload as Record<string, unknown>)?.new as Record<string, unknown> | undefined;
        if (!row || row.orbitId !== resolvedOrbitId) return;
        await useNotificationsStore.getState().hydrate(resolvedOrbitId);
      },
    });

    useRealtimeStore.getState().addSubscription(ref);

    return () => {
      unsubscribe();
      useRealtimeStore.getState().removeSubscription(ref.key);
    };
  }, [resolvedOrbitId]);
}

import { useEffect } from "react";
import { subscribeTable } from "@/lib/supabase/realtime";
import { useOrbitStore } from "@/stores/orbitStore";
import { useRealtimeStore } from "@/stores/realtimeStore";

export function useCallSignalsRealtime(onSignal: (payload: unknown) => void) {
  const orbitId = useOrbitStore((s) => s.profile?.orbitId);

  useEffect(() => {
    if (!orbitId) return;

    const { unsubscribe, ref } = subscribeTable({
      key: `call_signals_v2_${orbitId}`,
      channelName: `call_signals_v2_${orbitId}`,
      table: "orbit_call_signals_v2",
      callback: (payload: unknown) => {
        const row = (payload as any)?.new;
        if (!row || row.target_orbit_id !== orbitId) return;
        onSignal(row);
      },
    });

    useRealtimeStore.getState().addSubscription(ref);

    return () => {
      unsubscribe();
      useRealtimeStore.getState().removeSubscription(ref.key);
    };
  }, [orbitId, onSignal]);
}

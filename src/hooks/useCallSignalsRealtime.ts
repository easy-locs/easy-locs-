import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrbitStore } from "@/stores/orbitStore";

export function useCallSignalsRealtime(onSignal: (signal: any) => void) {
  const orbitId = useOrbitStore((s) => s.profile?.orbitId);

  useEffect(() => {
    if (!orbitId) return;

    const channel = supabase
      .channel(`call_signals_rt_${orbitId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "call_signals" },
        (payload: any) => {
          const row = payload.new;
          if (!row) return;
          // Don't process our own signals
          if (row.sender_orbit_id === orbitId) return;
          onSignal(row);
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [orbitId, onSignal]);
}

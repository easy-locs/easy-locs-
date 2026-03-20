import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrbitStore } from "@/stores/orbitStore";
import { useIncomingCallStore } from "@/stores/incomingCallStore";

export function useCallRealtime() {
  const orbit = useOrbitStore((s) => s.profile);

  useEffect(() => {
    if (!orbit?.orbitId) return;

    const channel = supabase
      .channel(`call_sessions_realtime_${orbit.orbitId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "orbit_call_sessions_v2",
        },
        (payload: any) => {
          const call = payload.new;
          if (call?.callee_orbit_id === orbit.orbitId && call?.status === "ringing") {
            useIncomingCallStore.setState({
              incoming: {
                sessionId: call.id,
                callerOrbitId: call.caller_orbit_id,
                mode: call.mode ?? "audio",
              },
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orbit?.orbitId]);
}

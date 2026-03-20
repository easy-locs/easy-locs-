import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrbitStore } from "@/stores/orbitStore";
import { useCallStore } from "@/stores/callStore";
import { useIncomingCallStore } from "@/stores/incomingCallStore";

export function useCallRealtime() {
  const orbitId = useOrbitStore((s) => s.profile?.orbitId);

  useEffect(() => {
    if (!orbitId) return;

    const channel = supabase
      .channel(`call_sessions_rt_${orbitId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "call_sessions" },
        (payload: any) => {
          const row = payload.new ?? payload.old;
          if (!row) return;

          // Incoming call detection
          if (
            payload.eventType === "INSERT" &&
            row.receiver_orbit_id === orbitId &&
            row.status === "ringing"
          ) {
            useCallStore.setState({ incoming: row, mode: "ringing" });
            useCallStore.getState().startMissedCallTimer(row);
            useIncomingCallStore.setState({
              incoming: {
                sessionId: row.id,
                callerOrbitId: row.caller_orbit_id,
                mode: row.call_type === "video" ? "video" : "audio",
              },
            });
          }

          // Session updates
          if (payload.eventType === "UPDATE") {
            const current = useCallStore.getState().current;
            if (current?.id === row.id) {
              useCallStore.setState({ current: row });
            }

            if (["ended", "rejected", "missed"].includes(row.status)) {
              const incoming = useCallStore.getState().incoming;
              if (incoming?.id === row.id) {
                useCallStore.setState({ incoming: null, mode: "idle" });
                useIncomingCallStore.setState({ incoming: null });
              }

              const missedTimer = useCallStore.getState().missedTimer;
              if (missedTimer) {
                clearTimeout(missedTimer);
                useCallStore.setState({ missedTimer: null });
              }
            }
          }
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [orbitId]);
}

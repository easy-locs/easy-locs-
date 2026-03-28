import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { reportHealth } from "@/lib/runtime/health-aggregator";
import { platformBus } from "@/lib/shared/platform-bus";

export function useOrbitCallRealtime(params: {
  currentOrbitId?: string | null;
  onIncomingCall: (payload: any) => void;
  onCallEnded: (payload: any) => void;
  onCallUpdated: (payload: any) => void;
}) {
  const { currentOrbitId, onIncomingCall, onCallEnded, onCallUpdated } = params;

  useEffect(() => {
    if (!currentOrbitId) return;

    const channel = supabase
      .channel(`orbit-calls-${currentOrbitId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "call_sessions",
          filter: `receiver_orbit_id=eq.${currentOrbitId}`,
        },
        (payload) => {
          platformBus.emit("call:incoming", { callId: (payload.new as any)?.id }, "orbit");
          reportHealth("orbit", "ok");
          onIncomingCall(payload.new);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "call_sessions",
        },
        (payload) => {
          const row = payload.new as any;
          if (row?.status === "ended" || row?.status === "missed" || row?.status === "declined") {
            platformBus.emit("call:ended", { status: row.status }, "orbit");
            onCallEnded(row);
          } else {
            platformBus.emit("call:updated", { status: row?.status }, "orbit");
            onCallUpdated(row);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentOrbitId, onIncomingCall, onCallEnded, onCallUpdated]);
}

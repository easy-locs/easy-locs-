/**
 * useCallSignals — Realtime hook for incoming WebRTC signals.
 */
import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { CallSignalRecord } from "@/lib/calls/call-types";
import { markSignalConsumed } from "@/lib/calls/call-session-service";

export function useCallSignals(params: {
  userId: string | null;
  onSignal: (signal: CallSignalRecord) => Promise<void> | void;
}) {
  const onSignalRef = useRef(params.onSignal);
  onSignalRef.current = params.onSignal;

  useEffect(() => {
    if (!params.userId) return;

    const channel = supabase
      .channel(`call-signals:${params.userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "orbit_call_signals",
          filter: `receiver_user_id=eq.${params.userId}`,
        },
        async (payload: any) => {
          const signal = payload.new as CallSignalRecord;
          await onSignalRef.current(signal);
          await markSignalConsumed(signal.id).catch(() => {});
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [params.userId]);
}

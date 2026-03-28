/**
 * useHudCallLifecycle — Atomic: missed call timeout + reconnect recovery effects.
 */
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface ActiveCall {
  sessionId?: string;
  uiState?: string;
  qualityState?: string | null;
}

export function useHudCallLifecycle(activeCall: ActiveCall | null, endCall: (reason: string) => void, patchCall: (patch: any) => void) {
  // Missed call timeout (30s)
  useEffect(() => {
    if (!activeCall?.sessionId || activeCall.uiState !== "incoming") return;
    const timer = window.setTimeout(() => {
      void (async () => {
        await (supabase as any).rpc("mark_call_as_missed_v2", { p_session_id: activeCall.sessionId, p_reason: "timeout" });
        endCall("missed");
      })();
    }, 30000);
    return () => window.clearTimeout(timer);
  }, [activeCall?.sessionId, activeCall?.uiState, endCall]);

  // Reconnect recovery (2.5s)
  useEffect(() => {
    if (!activeCall || activeCall.uiState !== "reconnecting") return;
    const timer = window.setTimeout(() => {
      patchCall({ uiState: "active", qualityState: "stable" });
    }, 2500);
    return () => window.clearTimeout(timer);
  }, [activeCall?.uiState, patchCall]);
}

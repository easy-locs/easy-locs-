/**
 * useHudCallTimeout — Atomic hook: manage missed call timeout and reconnection recovery.
 * Single responsibility: call timeout lifecycle in HudChatPanel.
 */
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface CallState {
  activeCall: {
    sessionId: string;
    uiState: string;
    [key: string]: any;
  } | null;
  endCall: (reason: string) => void;
  patchCall: (patch: Record<string, any>) => void;
}

export function useHudCallTimeout(callState: CallState) {
  // Missed call timeout — 30s
  useEffect(() => {
    if (!callState.activeCall?.sessionId) return;
    if (callState.activeCall.uiState !== "incoming") return;
    const timer = window.setTimeout(() => {
      void (async () => {
        await (supabase as any).rpc("mark_call_as_missed_v2", {
          p_session_id: callState.activeCall?.sessionId,
          p_reason: "timeout",
        });
        callState.endCall("missed");
      })();
    }, 30000);
    return () => window.clearTimeout(timer);
  }, [callState.activeCall?.sessionId, callState.activeCall?.uiState]);

  // Reconnect recovery — 2.5s
  useEffect(() => {
    if (!callState.activeCall) return;
    if (callState.activeCall.uiState !== "reconnecting") return;
    const timer = window.setTimeout(() => {
      callState.patchCall({ uiState: "active", qualityState: "stable" });
    }, 2500);
    return () => window.clearTimeout(timer);
  }, [callState.activeCall?.uiState]);
}

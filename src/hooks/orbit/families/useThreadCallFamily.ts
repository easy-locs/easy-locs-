/**
 * FAMILY: CALL — Canonical call state, actions, history, permissions, and lifecycle.
 * Single source of truth for all call-related logic in a thread.
 * Missed-call timeout + reconnect recovery are canonical here.
 */
import { useEffect } from "react";
import { useOrbitDevicePermissions } from "@/hooks/useOrbitDevicePermissions";
import { useOrbitCallState } from "@/hooks/useOrbitCallState";
import { useOrbitCallActions } from "@/hooks/useOrbitCallActions";
import { useOrbitCallHistory } from "@/hooks/useOrbitCallHistory";
import { useHudCallSetup } from "@/hooks/orbit/useHudCallSetup";
import { markCallAsMissedV2 } from "@/repositories/communication.repository";
import type { ConversationThread } from "@/components/communication-hub/types";

export function useThreadCallFamily(params: {
  thread: ConversationThread | null;
  currentUserId: string | null;
  currentOrbitId: string | null;
}) {
  const { thread, currentUserId, currentOrbitId } = params;

  const devicePermissions = useOrbitDevicePermissions();
  const callState = useOrbitCallState();

  const callActions = useOrbitCallActions({
    currentUserId,
    currentOrbitId,
    activeCall: callState.activeCall,
    patchCall: callState.patchCall,
    setUiState: callState.setUiState,
    endCall: callState.endCall,
  });

  const callHistory = useOrbitCallHistory(currentOrbitId);

  const { handleStartAudioCall, handleStartVideoCall } = useHudCallSetup(
    thread, devicePermissions, callActions, callState
  );

  // Canonical missed call timeout (30s)
  useEffect(() => {
    if (!callState.activeCall?.sessionId || callState.activeCall.uiState !== "incoming") return;
    const sessionId = callState.activeCall.sessionId;
    const timer = window.setTimeout(() => {
      void markCallAsMissedV2(sessionId, "timeout").then(() => callState.endCall("missed"));
    }, 30000);
    return () => window.clearTimeout(timer);
  }, [callState.activeCall?.sessionId, callState.activeCall?.uiState]);

  // Canonical reconnect recovery (2.5s)
  useEffect(() => {
    if (!callState.activeCall || callState.activeCall.uiState !== "reconnecting") return;
    const timer = window.setTimeout(() => {
      callState.patchCall({ uiState: "active", qualityState: "stable" });
    }, 2500);
    return () => window.clearTimeout(timer);
  }, [callState.activeCall?.uiState]);

  return {
    devicePermissions,
    callState,
    callActions,
    callHistory,
    handleStartAudioCall,
    handleStartVideoCall,
  };
}

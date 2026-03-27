import { useMemo, useState } from "react";
import type { OrbitActiveCall, OrbitCallMode, OrbitCallUiState } from "@/lib/orbit/orbit-call-types";

export function useOrbitCallState() {
  const [activeCall, setActiveCall] = useState<OrbitActiveCall | null>(null);

  const startOutgoing = (payload: {
    sessionId: string;
    conversationId?: string | null;
    peerUserId?: string | null;
    peerOrbitId?: string | null;
    peerName: string;
    mode: OrbitCallMode;
  }) => {
    setActiveCall({
      sessionId: payload.sessionId,
      conversationId: payload.conversationId ?? null,
      peerUserId: payload.peerUserId ?? null,
      peerOrbitId: payload.peerOrbitId ?? null,
      peerName: payload.peerName,
      mode: payload.mode,
      uiState: "outgoing",
      startedAt: new Date().toISOString(),
      muted: false,
      speakerOn: false,
      cameraOn: payload.mode === "video",
      localVideoEnabled: payload.mode === "video",
      remoteVideoEnabled: payload.mode === "video",
      reconnectCount: 0,
    });
  };

  const startIncoming = (payload: {
    sessionId: string;
    conversationId?: string | null;
    peerUserId?: string | null;
    peerOrbitId?: string | null;
    peerName: string;
    mode: OrbitCallMode;
  }) => {
    setActiveCall({
      sessionId: payload.sessionId,
      conversationId: payload.conversationId ?? null,
      peerUserId: payload.peerUserId ?? null,
      peerOrbitId: payload.peerOrbitId ?? null,
      peerName: payload.peerName,
      mode: payload.mode,
      uiState: "incoming",
      startedAt: new Date().toISOString(),
      muted: false,
      speakerOn: false,
      cameraOn: payload.mode === "video",
      localVideoEnabled: payload.mode === "video",
      remoteVideoEnabled: payload.mode === "video",
      reconnectCount: 0,
    });
  };

  const patchCall = (patch: Partial<OrbitActiveCall>) => {
    setActiveCall((prev) => (prev ? { ...prev, ...patch } : prev));
  };

  const setUiState = (uiState: OrbitCallUiState) => {
    patchCall({ uiState });
  };

  const endCall = (uiState: OrbitCallUiState = "ended") => {
    setActiveCall((prev) =>
      prev
        ? { ...prev, uiState, endedAt: new Date().toISOString() }
        : prev
    );
  };

  const clearCall = () => {
    setActiveCall(null);
  };

  const hasActiveCall = useMemo(() => {
    if (!activeCall) return false;
    return ["incoming", "outgoing", "connecting", "active", "reconnecting"].includes(activeCall.uiState);
  }, [activeCall]);

  return {
    activeCall,
    hasActiveCall,
    startOutgoing,
    startIncoming,
    patchCall,
    setUiState,
    endCall,
    clearCall,
  };
}

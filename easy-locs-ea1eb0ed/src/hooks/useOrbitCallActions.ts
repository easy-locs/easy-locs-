import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import type { OrbitCallUiState } from "@/lib/orbit/orbit-call-types";
import {
  acceptCallSession,
  declineCallSession,
  hangupCallSession,
  markCallReconnecting,
  createOutgoingCallSession,
} from "@/repositories/communication.repository";

export function useOrbitCallActions(params: {
  currentUserId?: string | null;
  currentOrbitId?: string | null;
  activeCall: any;
  patchCall: (patch: any) => void;
  setUiState: (state: OrbitCallUiState) => void;
  endCall: (state?: OrbitCallUiState) => void;
}) {
  const paramsRef = useRef(params);
  paramsRef.current = params;

  const [busy, setBusy] = useState(false);

  const acceptIncomingCall = useCallback(async () => {
    const p = paramsRef.current;
    if (!p.activeCall?.sessionId) return;
    setBusy(true);
    try {
      await acceptCallSession(p.activeCall.sessionId);
      p.patchCall({ uiState: "active", answeredAt: new Date().toISOString() });
    } catch (err: any) {
      toast.error(err?.message || "Failed to accept call");
      p.endCall("failed");
    } finally {
      setBusy(false);
    }
  }, []);

  const declineIncomingCall = useCallback(async () => {
    const p = paramsRef.current;
    if (!p.activeCall?.sessionId) return;
    setBusy(true);
    try {
      await declineCallSession(p.activeCall.sessionId);
      p.endCall("ended");
    } catch (err: any) {
      toast.error(err?.message || "Failed to decline call");
      p.endCall("failed");
    } finally {
      setBusy(false);
    }
  }, []);

  const hangupCall = useCallback(async (reason = "hangup") => {
    const p = paramsRef.current;
    if (!p.activeCall?.sessionId) return;
    setBusy(true);
    try {
      await hangupCallSession(p.activeCall.sessionId, reason);
      p.endCall("ended");
    } catch (err: any) {
      toast.error(err?.message || "Failed to end call");
      p.endCall("failed");
    } finally {
      setBusy(false);
    }
  }, []);

  const markReconnect = useCallback(async () => {
    const p = paramsRef.current;
    if (!p.activeCall?.sessionId) return;
    try {
      const nextCount = (p.activeCall.reconnectCount || 0) + 1;
      await markCallReconnecting(p.activeCall.sessionId, nextCount);
      p.patchCall({ reconnectCount: nextCount, uiState: "reconnecting" as OrbitCallUiState, qualityState: "reconnecting" });
    } catch {
    }
  }, []);

  const toggleMute = useCallback(async () => {
    const p = paramsRef.current;
    p.patchCall({ muted: !p.activeCall?.muted });
  }, []);

  const toggleSpeaker = useCallback(async () => {
    const p = paramsRef.current;
    p.patchCall({ speakerOn: !p.activeCall?.speakerOn });
  }, []);

  const toggleCamera = useCallback(async () => {
    const p = paramsRef.current;
    p.patchCall({ cameraOn: !p.activeCall?.cameraOn, localVideoEnabled: !p.activeCall?.localVideoEnabled });
  }, []);

  const createOutgoingCall = useCallback(async (payload: {
    conversationId?: string | null;
    peerOrbitId?: string | null;
    peerName: string;
    mode: "audio" | "video";
  }) => {
    const p = paramsRef.current;
    if (!p.currentUserId || !p.currentOrbitId) return null;
    setBusy(true);
    try {
      const session = await createOutgoingCallSession({
        conversationId: payload.conversationId,
        callerOrbitId: p.currentOrbitId,
        receiverOrbitId: payload.peerOrbitId,
        mode: payload.mode,
      });
      p.setUiState("outgoing");
      return session;
    } catch (err: any) {
      toast.error(err?.message || "Failed to start call");
      return null;
    } finally {
      setBusy(false);
    }
  }, []);

  return {
    busy,
    createOutgoingCall,
    acceptIncomingCall,
    declineIncomingCall,
    hangupCall,
    markReconnect,
    toggleMute,
    toggleSpeaker,
    toggleCamera,
  };
}

/**
 * useOrbitCallActions — Canonical call actions using repository layer.
 * Zero inline supabase. All DB ops go through communication.repository.
 */
import { useState } from "react";
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
  const { currentUserId, currentOrbitId, activeCall, patchCall, setUiState, endCall } = params;
  const [busy, setBusy] = useState(false);

  const acceptIncomingCall = async () => {
    if (!activeCall?.sessionId) return;
    setBusy(true);
    try {
      await acceptCallSession(activeCall.sessionId);
      patchCall({ uiState: "active", answeredAt: new Date().toISOString() });
    } catch (err: any) {
      toast.error(err?.message || "Failed to accept call");
      endCall("failed");
    } finally {
      setBusy(false);
    }
  };

  const declineIncomingCall = async () => {
    if (!activeCall?.sessionId) return;
    setBusy(true);
    try {
      await declineCallSession(activeCall.sessionId);
      endCall("ended");
    } catch (err: any) {
      toast.error(err?.message || "Failed to decline call");
      endCall("failed");
    } finally {
      setBusy(false);
    }
  };

  const hangupCall = async (reason = "hangup") => {
    if (!activeCall?.sessionId) return;
    setBusy(true);
    try {
      await hangupCallSession(activeCall.sessionId, reason);
      endCall("ended");
    } catch (err: any) {
      toast.error(err?.message || "Failed to end call");
      endCall("failed");
    } finally {
      setBusy(false);
    }
  };

  const markReconnect = async () => {
    if (!activeCall?.sessionId) return;
    try {
      const nextCount = (activeCall.reconnectCount || 0) + 1;
      await markCallReconnecting(activeCall.sessionId, nextCount);
      patchCall({ reconnectCount: nextCount, uiState: "reconnecting" as OrbitCallUiState, qualityState: "reconnecting" });
    } catch {
      // ignore
    }
  };

  const toggleMute = async () => {
    patchCall({ muted: !activeCall?.muted });
  };

  const toggleSpeaker = async () => {
    patchCall({ speakerOn: !activeCall?.speakerOn });
  };

  const toggleCamera = async () => {
    patchCall({ cameraOn: !activeCall?.cameraOn, localVideoEnabled: !activeCall?.localVideoEnabled });
  };

  const createOutgoingCall = async (payload: {
    conversationId?: string | null;
    peerOrbitId?: string | null;
    peerName: string;
    mode: "audio" | "video";
  }) => {
    if (!currentUserId || !currentOrbitId) return null;
    setBusy(true);
    try {
      const session = await createOutgoingCallSession({
        conversationId: payload.conversationId,
        callerOrbitId: currentOrbitId,
        receiverOrbitId: payload.peerOrbitId,
        mode: payload.mode,
      });
      setUiState("outgoing");
      return session;
    } catch (err: any) {
      toast.error(err?.message || "Failed to start call");
      return null;
    } finally {
      setBusy(false);
    }
  };

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

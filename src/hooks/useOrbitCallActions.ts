import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { OrbitCallUiState } from "@/lib/orbit/orbit-call-types";

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
      const now = new Date().toISOString();
      const { error: sessionErr } = await (supabase as any)
        .from("call_sessions")
        .update({ status: "active", answered_at: now, updated_at: now })
        .eq("id", activeCall.sessionId);
      if (sessionErr) throw sessionErr;

      await (supabase as any)
        .from("call_logs")
        .update({ status: "answered", answered_at: now })
        .eq("session_id", activeCall.sessionId);

      patchCall({ uiState: "active", answeredAt: now });
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
      const now = new Date().toISOString();
      await (supabase as any)
        .from("call_sessions")
        .update({ status: "declined", ended_at: now, updated_at: now, metadata: { ended_reason: "declined" } })
        .eq("id", activeCall.sessionId);

      await (supabase as any)
        .from("call_logs")
        .update({ status: "declined", ended_at: now, ended_reason: "declined" })
        .eq("session_id", activeCall.sessionId);

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
      const now = new Date().toISOString();
      await (supabase as any)
        .from("call_sessions")
        .update({ status: "ended", ended_at: now, updated_at: now, metadata: { ended_reason: reason } })
        .eq("id", activeCall.sessionId);

      await (supabase as any)
        .from("call_logs")
        .update({ status: "ended", ended_at: now, ended_reason: reason })
        .eq("session_id", activeCall.sessionId);

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
      await (supabase as any)
        .from("call_sessions")
        .update({ reconnect_count: nextCount, quality_state: "reconnecting", updated_at: new Date().toISOString() })
        .eq("id", activeCall.sessionId);

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
      const now = new Date().toISOString();
      const { data: session, error: sessionErr } = await (supabase as any)
        .from("call_sessions")
        .insert({
          conversation_id: payload.conversationId || null,
          caller_orbit_id: currentOrbitId,
          receiver_orbit_id: payload.peerOrbitId,
          call_type: payload.mode,
          status: "ringing",
          started_at: now,
          created_at: now,
          updated_at: now,
          metadata: {},
        })
        .select("*")
        .single();

      if (sessionErr) throw sessionErr;

      await (supabase as any)
        .from("call_logs")
        .insert({
          conversation_id: payload.conversationId || null,
          session_id: session.id,
          caller_orbit_id: currentOrbitId,
          receiver_orbit_id: payload.peerOrbitId,
          call_type: payload.mode,
          direction: "outgoing",
          status: "ringing",
          started_at: now,
          created_at: now,
          missed: false,
          metadata: {},
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

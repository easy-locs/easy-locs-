/**
 * useOrbitRTCSignaling — Hardened WebRTC signaling hook with self-filter + state guards.
 */
import { useEffect, useRef } from "react";
import { sendSignal, subscribeToSignals } from "@/lib/orbit/signaling";

export function useOrbitRTCSignaling(params: {
  callSessionId?: string;
  pc: RTCPeerConnection | null;
  userId?: string;
  workspaceId?: string;
  isCaller?: boolean;
}) {
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (!params.pc || !params.callSessionId) return;

    params.pc.onicecandidate = (e) => {
      if (!e.candidate) return;
      sendSignal({
        callSessionId: params.callSessionId!,
        senderId: params.userId,
        workspaceId: params.workspaceId,
        type: "ice",
        payload: e.candidate.toJSON ? e.candidate.toJSON() : e.candidate,
      });
    };

    const sub = subscribeToSignals({
      callSessionId: params.callSessionId,
      selfUserId: params.userId,
      onMessage: async (msg) => {
        if (!params.pc || !mountedRef.current) return;
        try {
          if (msg.message_type === "offer") {
            if (params.pc.signalingState !== "stable") return;
            await params.pc.setRemoteDescription(new RTCSessionDescription(msg.payload));
            const answer = await params.pc.createAnswer();
            await params.pc.setLocalDescription(answer);
            await sendSignal({
              callSessionId: params.callSessionId!,
              senderId: params.userId,
              workspaceId: params.workspaceId,
              type: "answer",
              payload: answer,
            });
          }
          if (msg.message_type === "answer") {
            if (!params.isCaller) return;
            if (params.pc.currentRemoteDescription) return;
            await params.pc.setRemoteDescription(new RTCSessionDescription(msg.payload));
          }
          if (msg.message_type === "ice") {
            await params.pc.addIceCandidate(new RTCIceCandidate(msg.payload));
          }
        } catch (err) {
          console.error("[RTC signaling] failed", err);
        }
      },
    });

    return () => { sub.unsubscribe(); };
  }, [params.callSessionId, params.pc, params.userId, params.workspaceId, params.isCaller]);
}

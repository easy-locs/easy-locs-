import { useEffect, useRef } from "react";
import { sendGhostCallSignal, subscribeGhostCallSignals } from "@/lib/orbit/ghost-calls";

const handledGhostSignalIds = new Set<string>();

export function useGhostRTC(params: {
  callSessionId?: string;
  participantId?: string;
  pc: RTCPeerConnection | null;
  isCaller?: boolean;
}) {
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (!params.callSessionId || !params.pc) return;

    params.pc.onicecandidate = (e) => {
      if (!e.candidate) return;
      sendGhostCallSignal({
        callSessionId: params.callSessionId!,
        senderParticipantId: params.participantId,
        signalType: "ice",
        payload: e.candidate.toJSON ? e.candidate.toJSON() : (e.candidate as any),
      });
    };

    const sub = subscribeGhostCallSignals(params.callSessionId, async (signal) => {
      if (!mountedRef.current || !params.pc) return;
      if (!signal?.id) return;
      if (handledGhostSignalIds.has(signal.id)) return;
      handledGhostSignalIds.add(signal.id);
      if (signal.sender_participant_id && signal.sender_participant_id === params.participantId) return;

      try {
        if (signal.signal_type === "offer") {
          if (params.pc.signalingState !== "stable") return;
          await params.pc.setRemoteDescription(new RTCSessionDescription(signal.payload));
          const answer = await params.pc.createAnswer();
          await params.pc.setLocalDescription(answer);
          await sendGhostCallSignal({
            callSessionId: params.callSessionId!,
            senderParticipantId: params.participantId,
            signalType: "answer",
            payload: answer,
          });
        }
        if (signal.signal_type === "answer") {
          if (!params.isCaller) return;
          if (params.pc.currentRemoteDescription) return;
          await params.pc.setRemoteDescription(new RTCSessionDescription(signal.payload));
        }
        if (signal.signal_type === "ice") {
          await params.pc.addIceCandidate(new RTCIceCandidate(signal.payload));
        }
      } catch (err) {
        console.error("[ghost rtc] signal error", err);
      }
    });

    return () => { sub.unsubscribe(); };
  }, [params.callSessionId, params.participantId, params.pc, params.isCaller]);
}

export async function startGhostOffer(params: {
  callSessionId: string;
  participantId?: string;
  pc: RTCPeerConnection;
}) {
  const offer = await params.pc.createOffer({
    offerToReceiveAudio: true,
    offerToReceiveVideo: true,
  });
  await params.pc.setLocalDescription(offer);
  await sendGhostCallSignal({
    callSessionId: params.callSessionId,
    senderParticipantId: params.participantId,
    signalType: "offer",
    payload: offer,
  });
}

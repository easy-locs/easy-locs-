/**
 * useOrbitWebRTC — React hook for WebRTC peer lifecycle.
 */
import { useCallback, useRef, useState } from "react";
import {
  attachLocalMedia,
  createOffer,
  createAnswer,
  createOrbitPeerConnection,
} from "@/lib/orbit/webrtc-peer";

export function useOrbitWebRTC() {
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const [connected, setConnected] = useState(false);

  const init = useCallback(async (mode: "voice" | "video") => {
    const pc = await createOrbitPeerConnection();
    pcRef.current = pc;

    const remote = new MediaStream();
    remoteStreamRef.current = remote;

    pc.ontrack = (event) => {
      event.streams[0]?.getTracks().forEach((track) => remote.addTrack(track));
    };
    pc.onconnectionstatechange = () => {
      setConnected(pc.connectionState === "connected");
    };

    const local = await attachLocalMedia({ pc, audio: true, video: mode === "video" });
    localStreamRef.current = local;

    return { pc, local, remote };
  }, []);

  const makeOffer = useCallback(async () => {
    if (!pcRef.current) throw new Error("Peer not initialized");
    return createOffer(pcRef.current);
  }, []);

  const makeAnswer = useCallback(async () => {
    if (!pcRef.current) throw new Error("Peer not initialized");
    return createAnswer(pcRef.current);
  }, []);

  const setRemote = useCallback(async (desc: RTCSessionDescriptionInit) => {
    if (!pcRef.current) throw new Error("Peer not initialized");
    await pcRef.current.setRemoteDescription(desc);
  }, []);

  const addIceCandidate = useCallback(async (candidate: RTCIceCandidateInit) => {
    if (!pcRef.current) throw new Error("Peer not initialized");
    await pcRef.current.addIceCandidate(candidate);
  }, []);

  const destroy = useCallback(() => {
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    pcRef.current?.close();
    pcRef.current = null;
    localStreamRef.current = null;
    remoteStreamRef.current = null;
    setConnected(false);
  }, []);

  return {
    connected, init, makeOffer, makeAnswer, setRemote, addIceCandidate, destroy,
    localStreamRef, remoteStreamRef, pcRef,
  };
}

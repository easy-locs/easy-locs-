import { create } from "zustand";
import { useCallSignalingStore } from "@/stores/callSignalingStore";
import { useSimpleRtcStore } from "@/stores/simpleRtcStore";
import { useCallStore } from "@/stores/callStore";
import { useUiShellStore } from "@/stores/uiShellStore";

type RealtimeCallStore = {
  peerConnection: RTCPeerConnection | null;
  remoteOrbitId: string | null;
  startOutgoingCall: (calleeOrbitId: string, mode: "audio" | "video") => Promise<void>;
  acceptIncomingCall: (sessionId: string, callerOrbitId: string, mode: "audio" | "video") => Promise<void>;
  handleSignal: (row: Record<string, unknown>) => Promise<void>;
  hangup: () => Promise<void>;
};

export const useRealtimeCallStore = create<RealtimeCallStore>((set, get) => ({
  peerConnection: null,
  remoteOrbitId: null,

  startOutgoingCall: async (calleeOrbitId, mode) => {
    await useCallSignalingStore.getState().createCallSession(calleeOrbitId, mode);
    await useSimpleRtcStore.getState().initLocalMedia(mode);

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    const local = useSimpleRtcStore.getState().localStream;
    local?.getTracks().forEach((track) => {
      pc.addTrack(track, local);
    });

    pc.onicecandidate = async (event) => {
      if (!event.candidate) return;
      await useCallSignalingStore.getState().sendSignal("ice", calleeOrbitId, {
        candidate: event.candidate.toJSON(),
      });
    };

    pc.ontrack = (event) => {
      useSimpleRtcStore.setState({
        remoteStream: event.streams[0] ?? null,
      });
    };

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    await useCallSignalingStore.getState().sendSignal("offer", calleeOrbitId, {
      sdp: offer.sdp,
      type: offer.type,
    });

    await useCallSignalingStore.getState().updateSessionStatus("connecting");

    useCallStore.getState().startCall(calleeOrbitId, mode);
    useUiShellStore.getState().setCallFullscreen(true);

    set({ peerConnection: pc, remoteOrbitId: calleeOrbitId });
  },

  acceptIncomingCall: async (_sessionId, callerOrbitId, mode) => {
    await useSimpleRtcStore.getState().initLocalMedia(mode);

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    const local = useSimpleRtcStore.getState().localStream;
    local?.getTracks().forEach((track) => {
      pc.addTrack(track, local);
    });

    pc.onicecandidate = async (event) => {
      if (!event.candidate) return;
      await useCallSignalingStore.getState().sendSignal("ice", callerOrbitId, {
        candidate: event.candidate.toJSON(),
      });
    };

    pc.ontrack = (event) => {
      useSimpleRtcStore.setState({
        remoteStream: event.streams[0] ?? null,
      });
    };

    useCallStore.getState().startCall(callerOrbitId, mode);
    useUiShellStore.getState().setCallFullscreen(true);

    set({ peerConnection: pc, remoteOrbitId: callerOrbitId });
  },

  handleSignal: async (row) => {
    const pc = get().peerConnection;
    const signal = row as { signal_type: string; sender_orbit_id: string; session_id: string; payload: Record<string, unknown> };

    if (signal.signal_type === "offer") {
      const callerOrbitId = signal.sender_orbit_id;
      await get().acceptIncomingCall(signal.session_id as string, callerOrbitId, "video");

      const nextPc = get().peerConnection;
      if (!nextPc) return;

      await nextPc.setRemoteDescription(
        new RTCSessionDescription({
          type: "offer",
          sdp: (signal.payload as Record<string, string>)?.sdp,
        })
      );

      const answer = await nextPc.createAnswer();
      await nextPc.setLocalDescription(answer);

      await useCallSignalingStore.getState().sendSignal("answer", callerOrbitId, {
        sdp: answer.sdp,
        type: answer.type,
      });
      return;
    }

    if (!pc) return;

    if (signal.signal_type === "answer") {
      await pc.setRemoteDescription(
        new RTCSessionDescription({
          type: "answer",
          sdp: (signal.payload as Record<string, string>)?.sdp,
        })
      );
      await useCallSignalingStore.getState().updateSessionStatus("active");
      return;
    }

    if (signal.signal_type === "ice") {
      const candidate = (signal.payload as Record<string, unknown>)?.candidate;
      if (candidate) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate as RTCIceCandidateInit));
      }
      return;
    }

    if (signal.signal_type === "hangup") {
      await get().hangup();
    }
  },

  hangup: async () => {
    const remoteOrbitId = get().remoteOrbitId;
    const pc = get().peerConnection;

    if (remoteOrbitId) {
      await useCallSignalingStore.getState().sendSignal("hangup", remoteOrbitId, {
        reason: "ended",
      });
    }

    pc?.close();
    useSimpleRtcStore.getState().cleanup();
    useCallStore.getState().endCall();
    useUiShellStore.getState().setCallFullscreen(false);
    await useCallSignalingStore.getState().updateSessionStatus("ended");
    useCallSignalingStore.getState().clear();

    set({ peerConnection: null, remoteOrbitId: null });
  },
}));

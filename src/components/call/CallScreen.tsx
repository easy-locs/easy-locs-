import { useEffect, useRef, useState, useCallback } from "react";
import { createPeerConnection } from "@/lib/webrtc/peer";
import { useCallStore } from "@/stores/callStore";
import { useCallSignalStore } from "@/stores/callSignalStore";
import { useCallSignalsRealtime } from "@/hooks/useCallSignalsRealtime";
import { useOrbitStore } from "@/stores/orbitStore";
import { useDebugCommsStore } from "@/stores/debugCommsStore";
import { PhoneOff, Mic, MicOff, Video, VideoOff } from "lucide-react";

function formatDuration(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function CallScreen() {
  const current = useCallStore((s) => s.current);
  const mode = useCallStore((s) => s.mode);
  const endCall = useCallStore((s) => s.endCall);
  const localMicEnabled = useCallStore((s) => s.localMicEnabled);
  const localCamEnabled = useCallStore((s) => s.localCamEnabled);
  const toggleMic = useCallStore((s) => s.toggleMic);
  const toggleCam = useCallStore((s) => s.toggleCam);
  const sendSignal = useCallSignalStore((s) => s.sendSignal);
  const orbitId = useOrbitStore((s) => s.profile?.orbitId);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const startedAtRef = useRef<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [connectionState, setConnectionState] = useState("new");

  const isVideo = current?.call_type === "video";

  useEffect(() => {
    if (!current || !orbitId || mode === "idle" || mode === "ended") return;

    let timer: ReturnType<typeof setInterval>;
    let mounted = true;

    const run = async () => {
      const pc = await createPeerConnection();
      pcRef.current = pc;
      startedAtRef.current = Date.now();

      pc.onconnectionstatechange = () => {
        if (mounted) setConnectionState(pc.connectionState);
        useDebugCommsStore.getState().setWebrtc({ webrtcConnectionState: pc.connectionState });
      };

      pc.oniceconnectionstatechange = () => {
        useDebugCommsStore.getState().setWebrtc({ webrtcIceConnectionState: pc.iceConnectionState });
      };

      pc.onicegatheringstatechange = () => {
        useDebugCommsStore.getState().setWebrtc({ webrtcIceGatheringState: pc.iceGatheringState });
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          const candidate = event.candidate.candidate ?? "";
          if (candidate.includes("typ relay")) {
            useDebugCommsStore.getState().setWebrtc({ hasRelayCandidate: true });
          }
          void sendSignal(current.id, "candidate", event.candidate.toJSON());
        }
      };

      pc.ontrack = (event) => {
        const stream = event.streams[0];
        if (remoteAudioRef.current) remoteAudioRef.current.srcObject = stream;
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = stream;
      };

      try {
        const localStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: isVideo,
        });
        if (!mounted) return;

        localStreamRef.current = localStream;
        localStream.getTracks().forEach((t) => pc.addTrack(t, localStream));

        if (localVideoRef.current && isVideo) {
          localVideoRef.current.srcObject = localStream;
        }

        // Caller creates offer
        if (current.caller_orbit_id === orbitId) {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          await sendSignal(current.id, "offer", offer);
        }

        timer = setInterval(() => {
          if (startedAtRef.current) {
            setElapsed(Math.floor((Date.now() - startedAtRef.current) / 1000));
          }
        }, 1000);
      } catch (err) {
        console.error("getUserMedia failed", err);
      }
    };

    void run();

    return () => {
      mounted = false;
      clearInterval(timer);
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
      pcRef.current?.close();
      pcRef.current = null;
      startedAtRef.current = null;
      setElapsed(0);
    };
  }, [current?.id, orbitId, mode]);

  // Mute/unmute tracks reactively
  useEffect(() => {
    localStreamRef.current?.getAudioTracks().forEach((t) => {
      t.enabled = localMicEnabled;
    });
  }, [localMicEnabled]);

  useEffect(() => {
    localStreamRef.current?.getVideoTracks().forEach((t) => {
      t.enabled = localCamEnabled;
    });
  }, [localCamEnabled]);

  const handleSignal = useCallback(async (sig: any) => {
    const pc = pcRef.current;
    if (!pc || !current || !orbitId) return;
    if (sig.session_id !== current.id) return;

    try {
      if (sig.signal_type === "offer") {
        await pc.setRemoteDescription(new RTCSessionDescription(sig.payload));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await sendSignal(current.id, "answer", answer);
      } else if (sig.signal_type === "answer") {
        await pc.setRemoteDescription(new RTCSessionDescription(sig.payload));
      } else if (sig.signal_type === "candidate") {
        await pc.addIceCandidate(new RTCIceCandidate(sig.payload));
      } else if (sig.signal_type === "hangup") {
        await endCall(current.id, current.conversation_id ?? undefined, elapsed);
      }
    } catch (e) {
      console.error("Signal handling error", e);
    }
  }, [current?.id, orbitId, elapsed, sendSignal, endCall]);

  useCallSignalsRealtime(handleSignal);

  if (!current || mode === "idle" || mode === "ended") return null;

  return (
    <div className="fixed inset-0 z-[9995] bg-black/90 flex flex-col items-center justify-center text-white">
      {/* Status */}
      <p className="text-sm text-white/60 mb-1">
        {mode === "ringing" ? "Calling…" : mode === "connecting" ? "Connecting…" : "In call"}
      </p>
      <p className="text-xs text-white/40 mb-2">{connectionState}</p>
      <p className="text-2xl font-semibold tabular-nums mb-6">{formatDuration(elapsed)}</p>

      {/* Video areas */}
      {isVideo && (
        <div className="relative w-full max-w-md aspect-[3/4] mb-6">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="absolute inset-0 w-full h-full object-cover rounded-2xl"
          />
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="absolute top-3 right-3 w-24 h-32 object-cover rounded-xl border-2 border-white/20"
          />
        </div>
      )}

      {/* Audio element (hidden) */}
      <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />

      {/* Controls */}
      <div className="flex items-center gap-5">
        <button
          onClick={toggleMic}
          className="w-14 h-14 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 transition-colors active:scale-[0.95]"
        >
          {localMicEnabled ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6 text-red-400" />}
        </button>

        {isVideo && (
          <button
            onClick={toggleCam}
            className="w-14 h-14 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 transition-colors active:scale-[0.95]"
          >
            {localCamEnabled ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6 text-red-400" />}
          </button>
        )}

        <button
          onClick={async () => {
            if (!current) return;
            await sendSignal(current.id, "hangup", { ended: true });
            await endCall(current.id, current.conversation_id ?? undefined, elapsed);
          }}
          className="w-16 h-16 rounded-full flex items-center justify-center bg-destructive hover:bg-destructive/90 transition-colors active:scale-[0.95]"
        >
          <PhoneOff className="w-7 h-7" />
        </button>
      </div>
    </div>
  );
}

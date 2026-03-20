/**
 * CallScreen — Full-screen call UI.
 * Works across iOS, Android, and Desktop with safe-area support.
 */
import { useEffect, useRef, useState, useCallback } from "react";
import { createPeerConnection } from "@/lib/webrtc/peer";
import { useCallStore } from "@/stores/callStore";
import { useCallSignalStore } from "@/stores/callSignalStore";
import { useCallSignalsRealtime } from "@/hooks/useCallSignalsRealtime";
import { useOrbitStore } from "@/stores/orbitStore";
import { useDebugCommsStore } from "@/stores/debugCommsStore";
import { useUiShellStore } from "@/stores/uiShellStore";
import { PhoneOff, Mic, MicOff, Video, VideoOff, Volume2 } from "lucide-react";

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
  const setCallFullscreen = useUiShellStore((s) => s.setCallFullscreen);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const startedAtRef = useRef<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [connectionState, setConnectionState] = useState("new");

  const isVideo = current?.call_type === "video";

  // Ensure fullscreen on mount, remove on unmount
  useEffect(() => {
    if (current && mode !== "idle" && mode !== "ended") {
      setCallFullscreen(true);
    }
    return () => { setCallFullscreen(false); };
  }, [current?.id, mode, setCallFullscreen]);

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

  const peerLabel = current.caller_orbit_id === orbitId
    ? current.receiver_orbit_id
    : current.caller_orbit_id;

  const statusLabel = mode === "ringing" ? "Appel en cours…" : mode === "connecting" ? "Connexion…" : "En appel";

  return (
    <div
      className="fixed inset-0 flex flex-col bg-black text-white select-none"
      style={{
        zIndex: 9999,
        paddingTop: "env(safe-area-inset-top, 0px)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        paddingLeft: "env(safe-area-inset-left, 0px)",
        paddingRight: "env(safe-area-inset-right, 0px)",
      }}
    >
      {/* Video background layer */}
      {isVideo && (
        <div className="absolute inset-0">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
          />
          {/* Local PiP */}
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="absolute top-16 right-4 w-28 h-40 object-cover rounded-2xl border-2 border-white/20 shadow-2xl"
            style={{ marginTop: "env(safe-area-inset-top, 0px)" }}
          />
        </div>
      )}

      {/* Hidden audio for voice calls */}
      <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />

      {/* Top section: status info */}
      <div className={`flex-1 flex flex-col items-center pt-16 ${isVideo ? "relative z-10" : ""}`}>
        {/* Avatar circle for audio calls */}
        {!isVideo && (
          <div className="w-28 h-28 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center mb-6">
            <span className="text-3xl font-bold text-white/80">
              {(peerLabel || "?").substring(0, 2).toUpperCase()}
            </span>
          </div>
        )}

        <p className="text-lg font-semibold tracking-wide">
          {peerLabel || "Unknown"}
        </p>

        <p className="text-sm text-white/60 mt-1">{statusLabel}</p>

        {mode === "active" && (
          <p className="text-3xl font-light tabular-nums mt-4 tracking-wider">
            {formatDuration(elapsed)}
          </p>
        )}

        {connectionState !== "connected" && connectionState !== "new" && (
          <p className="text-xs text-white/30 mt-2">{connectionState}</p>
        )}
      </div>

      {/* Bottom controls */}
      <div className={`pb-10 ${isVideo ? "relative z-10" : ""}`}>
        <div className="flex items-center justify-center gap-6">
          {/* Mute */}
          <button
            onClick={toggleMic}
            className="w-16 h-16 rounded-full flex items-center justify-center transition-all duration-200 active:scale-[0.92]"
            style={{ background: localMicEnabled ? "rgba(255,255,255,0.12)" : "rgba(239,68,68,0.6)" }}
            aria-label={localMicEnabled ? "Mute" : "Unmute"}
          >
            {localMicEnabled ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
          </button>

          {/* Speaker (placeholder) */}
          {!isVideo && (
            <button
              className="w-16 h-16 rounded-full flex items-center justify-center bg-white/12 transition-all duration-200 active:scale-[0.92]"
              aria-label="Speaker"
            >
              <Volume2 className="w-6 h-6" />
            </button>
          )}

          {/* Video toggle */}
          {isVideo && (
            <button
              onClick={toggleCam}
              className="w-16 h-16 rounded-full flex items-center justify-center transition-all duration-200 active:scale-[0.92]"
              style={{ background: localCamEnabled ? "rgba(255,255,255,0.12)" : "rgba(239,68,68,0.6)" }}
              aria-label={localCamEnabled ? "Camera off" : "Camera on"}
            >
              {localCamEnabled ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
            </button>
          )}

          {/* Hang up */}
          <button
            onClick={async () => {
              if (!current) return;
              await sendSignal(current.id, "hangup", { ended: true });
              await endCall(current.id, current.conversation_id ?? undefined, elapsed);
            }}
            className="w-[72px] h-[72px] rounded-full flex items-center justify-center bg-destructive shadow-lg shadow-destructive/40 transition-all duration-200 active:scale-[0.90] hover:bg-destructive/90"
            aria-label="End call"
          >
            <PhoneOff className="w-7 h-7" />
          </button>
        </div>
      </div>
    </div>
  );
}

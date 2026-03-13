/**
 * InAppCallDialog — Full in-app call UI (caller & callee).
 * Supports audio AND video calls with camera feed display.
 * Mobile-first design with bottom-sheet feel.
 * Safari: handles audio.play() promise + playsInline.
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  PhoneOff, Mic, MicOff, Volume2, VolumeX, VideoIcon, VideoOff,
  Loader2, Shield, MessageSquare, WifiOff, User, CameraIcon, RotateCcw,
} from "lucide-react";
import { CallManager, type CallStatus, type CallState } from "@/lib/call-manager";

interface InAppCallDialogProps {
  open: boolean;
  onClose: () => void;
  callManager: CallManager | null;
  peerName: string;
  contextLabel?: string;
  onFallbackChat?: () => void;
}

export default function InAppCallDialog({
  open, onClose, callManager, peerName, contextLabel, onFallbackChat,
}: InAppCallDialogProps) {
  const [status, setStatus] = useState<CallStatus>("idle");
  const [muted, setMuted] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [usingRelay, setUsingRelay] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [isVideo, setIsVideo] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);

  // Attach remote stream - separate audio and video handling
  useEffect(() => {
    if (!remoteStream) return;

    const hasVideo = remoteStream.getVideoTracks().length > 0;
    const hasAudio = remoteStream.getAudioTracks().length > 0;

    // Always attach audio to dedicated audio element
    if (hasAudio && remoteAudioRef.current) {
      const audioEl = remoteAudioRef.current;
      const audioStream = new MediaStream(remoteStream.getAudioTracks());
      audioEl.srcObject = audioStream;
      audioEl.volume = 1;
      audioEl.muted = false;
      const p = audioEl.play();
      if (p) p.catch(() => {
        const retry = () => { audioEl.play().catch(() => {}); document.removeEventListener("touchstart", retry); document.removeEventListener("click", retry); };
        document.addEventListener("touchstart", retry, { once: true });
        document.addEventListener("click", retry, { once: true });
      });
    }

    // Attach video if tracks exist
    if (hasVideo && remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
      remoteVideoRef.current.play().catch(() => {});
    }
  }, [remoteStream]);

  // Attach local stream for self-view
  useEffect(() => {
    if (localStream && localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
      localVideoRef.current.play().catch(() => {});
      setVideoEnabled(localStream.getVideoTracks().some(t => t.enabled));
    }
  }, [localStream]);

  const handleStateChange = useCallback((state: Partial<CallState>) => {
    if (state.status !== undefined) setStatus(state.status);
    if (state.elapsed !== undefined) setElapsed(state.elapsed);
    if (state.usingRelay !== undefined) setUsingRelay(state.usingRelay);
    if (state.error !== undefined) setError(state.error);
    if (state.remoteStream !== undefined) setRemoteStream(state.remoteStream);
    if (state.localStream !== undefined) setLocalStream(state.localStream);
    if (state.isVideo !== undefined) setIsVideo(state.isVideo);
  }, []);

  useEffect(() => {
    if (callManager) {
      callManager.onStateChange = handleStateChange;
    }
  }, [callManager, handleStateChange]);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setStatus("idle");
      setMuted(false);
      setSpeakerOn(true);
      setVideoEnabled(false);
      setElapsed(0);
      setUsingRelay(false);
      setError(null);
      setRemoteStream(null);
      setLocalStream(null);
      setIsVideo(false);
      setIsEnding(false);
      setFacingMode("user");
    }
  }, [open]);

  const handleEndCall = async () => {
    if (isEnding) return;
    setIsEnding(true);
    try {
      if (!["ended", "declined", "missed", "failed", "network_blocked"].includes(status)) {
        await callManager?.endCall();
      }
      onClose();
    } finally {
      setIsEnding(false);
    }
  };

  const handleToggleMute = () => {
    const isMuted = callManager?.toggleMute();
    setMuted(!!isMuted);
  };

  const handleToggleVideo = async () => {
    if (!localStream || !callManager) return;
    const videoTracks = localStream.getVideoTracks();
    if (videoTracks.length > 0) {
      // Toggle existing video tracks
      videoTracks.forEach(t => { t.enabled = !t.enabled; });
      setVideoEnabled(videoTracks.some(t => t.enabled));
    } else {
      // No video track yet - add one dynamically
      try {
        const videoStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode, width: { ideal: 640 }, height: { ideal: 480 } },
        });
        const videoTrack = videoStream.getVideoTracks()[0];
        if (videoTrack) {
          localStream.addTrack(videoTrack);
          setVideoEnabled(true);
          setIsVideo(true);
          // Notify CallManager to add track to peer connection
          callManager.addVideoTrack?.(videoTrack);
        }
      } catch {
        // Camera access denied
      }
    }
  };

  const handleFlipCamera = async () => {
    if (!localStream) return;
    const newFacing = facingMode === "user" ? "environment" : "user";
    setFacingMode(newFacing);
    try {
      const videoStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: newFacing, width: { ideal: 640 }, height: { ideal: 480 } },
      });
      const newTrack = videoStream.getVideoTracks()[0];
      const oldTrack = localStream.getVideoTracks()[0];
      if (oldTrack) {
        localStream.removeTrack(oldTrack);
        oldTrack.stop();
      }
      if (newTrack) {
        localStream.addTrack(newTrack);
        callManager?.replaceVideoTrack?.(newTrack);
      }
    } catch {}
  };

  const handleToggleSpeaker = () => {
    const newState = !speakerOn;
    setSpeakerOn(newState);

    const audioEl = remoteAudioRef.current;
    if (audioEl) {
      audioEl.volume = 1;
      audioEl.muted = false;
      // Switch audio output: "communications" = earpiece, "default" = speaker
      if ("setSinkId" in audioEl && typeof (audioEl as any).setSinkId === "function") {
        (audioEl as any).setSinkId(newState ? "default" : "communications").catch(() => {
          // Fallback: try default if communications not available
          (audioEl as any).setSinkId("default").catch(() => {});
        });
      }
    }

    // iOS audioSession API
    const nav = navigator as any;
    if (nav?.audioSession && typeof nav.audioSession === "object") {
      try {
        // "playback" routes to speaker, "play-and-record" routes to earpiece
        nav.audioSession.type = newState ? "playback" : "play-and-record";
      } catch {}
    }

    // Android WebView: try AudioContext routing hint
    try {
      const audioCtx = new AudioContext();
      if ((audioCtx as any).setSinkId) {
        (audioCtx as any).setSinkId(newState ? "" : "communications").catch(() => {});
      }
      audioCtx.close();
    } catch {}
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const isNetworkBlocked = status === "network_blocked" || status === "failed";
  const hasRemoteVideo = remoteStream?.getVideoTracks().some(t => t.enabled) || false;
  const showVideoUI = isVideo || hasRemoteVideo || videoEnabled;

  const statusConfig: Record<string, { label: string; icon?: React.ReactNode }> = {
    idle: { label: "" },
    ringing: { label: "Ringing...", icon: <Loader2 className="h-3 w-3 animate-spin" /> },
    connecting: { label: "Connecting...", icon: <Loader2 className="h-3 w-3 animate-spin" /> },
    active: { label: formatTime(elapsed) },
    ended: { label: "Call ended" },
    declined: { label: "Call declined" },
    missed: { label: "No answer" },
    failed: { label: "Call failed" },
    network_blocked: { label: "Network restricted" },
  };

  const current = statusConfig[status] || statusConfig.idle;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleEndCall()}>
      <DialogContent className={`p-0 overflow-hidden bg-background/95 backdrop-blur-xl border-border ${showVideoUI ? "sm:max-w-lg" : "sm:max-w-sm"}`}>
        {/* Hidden audio element for remote stream */}
        <audio ref={remoteAudioRef} autoPlay playsInline />

        {showVideoUI ? (
          /* ═══ VIDEO CALL LAYOUT ═══ */
          <div className="relative" style={{ minHeight: 400 }}>
            {/* Remote video (fullscreen) */}
            <video ref={remoteVideoRef} autoPlay playsInline
              className="w-full h-full object-cover bg-black"
              style={{ minHeight: 400 }}
            />
            {!hasRemoteVideo && (
              <div className="absolute inset-0 flex items-center justify-center bg-background">
                <div className="text-center">
                  <div className="mx-auto w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <User className="h-10 w-10 text-primary/60" />
                  </div>
                  <p className="text-lg font-semibold text-foreground">{peerName}</p>
                  <div className="flex items-center justify-center gap-1.5 mt-2 text-sm text-muted-foreground">
                    {current.icon}
                    <span className={status === "active" ? "font-mono font-medium text-foreground" : ""}>{current.label}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Local self-view (picture-in-picture) */}
            {videoEnabled && (
              <div className="absolute top-4 right-4 w-28 h-40 rounded-xl overflow-hidden shadow-lg border border-border/50">
                <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover mirror-video" />
                {/* Flip camera button */}
                <button onClick={handleFlipCamera}
                  className="absolute bottom-1 right-1 w-6 h-6 rounded-full bg-black/50 flex items-center justify-center">
                  <RotateCcw className="h-3 w-3 text-white" />
                </button>
              </div>
            )}

            {/* Status overlay */}
            <div className="absolute top-4 left-4 flex items-center gap-2">
              {usingRelay && status === "active" && (
                <Badge variant="outline" className="gap-1 text-[10px] text-amber-600 border-amber-300 bg-background/80 backdrop-blur-sm">Relay</Badge>
              )}
              <Badge variant="outline" className="gap-1 text-[10px] bg-background/80 backdrop-blur-sm">
                <Shield className="h-2.5 w-2.5 text-green-500" /> Encrypted
              </Badge>
              {status === "active" && (
                <Badge variant="outline" className="text-[10px] font-mono bg-background/80 backdrop-blur-sm">{formatTime(elapsed)}</Badge>
              )}
            </div>

            {/* Controls */}
            <div className="absolute bottom-6 left-0 right-0 flex items-center justify-center gap-3">
              <button onClick={handleToggleMute} disabled={status !== "active" || isEnding}
                className={`w-12 h-12 rounded-full flex items-center justify-center backdrop-blur-md ${muted ? "bg-destructive/80 text-white" : "bg-background/70 text-foreground"} disabled:opacity-40`}>
                {muted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              </button>
              <button onClick={handleToggleVideo} disabled={status !== "active" || isEnding}
                className={`w-12 h-12 rounded-full flex items-center justify-center backdrop-blur-md ${!videoEnabled ? "bg-destructive/80 text-white" : "bg-background/70 text-foreground"} disabled:opacity-40`}>
                {videoEnabled ? <VideoIcon className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
              </button>
              <button onClick={handleEndCall} disabled={isEnding}
                className="w-14 h-14 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow-lg disabled:opacity-60">
                {isEnding ? <Loader2 className="h-6 w-6 animate-spin" /> : <PhoneOff className="h-6 w-6" />}
              </button>
              <button onClick={handleToggleSpeaker} disabled={status !== "active" || isEnding}
                className={`w-12 h-12 rounded-full flex items-center justify-center backdrop-blur-md ${!speakerOn ? "bg-destructive/80 text-white" : "bg-background/70 text-foreground"} disabled:opacity-40`}>
                {speakerOn ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
              </button>
            </div>
          </div>
        ) : (
          /* ═══ AUDIO CALL LAYOUT ═══ */
          <>
            <div className="pt-8 pb-4 px-6 text-center">
              <div className="mx-auto w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <User className="h-10 w-10 text-primary/60" />
              </div>
              <p className="text-lg font-semibold text-foreground">{peerName}</p>
              {contextLabel && <p className="text-xs text-muted-foreground mt-0.5 truncate">{contextLabel}</p>}
              <div className="flex items-center justify-center gap-2 mt-3">
                {usingRelay && status === "active" && (
                  <Badge variant="outline" className="gap-1 text-[10px] text-amber-600 border-amber-300">Relay</Badge>
                )}
                <Badge variant="outline" className="gap-1 text-[10px]">
                  <Shield className="h-2.5 w-2.5 text-green-500" /> Encrypted
                </Badge>
              </div>
              <div className="mt-3 text-sm text-muted-foreground flex items-center justify-center gap-1.5">
                {current.icon}
                <span className={status === "active" ? "font-mono text-foreground font-medium" : ""}>{current.label}</span>
              </div>
            </div>

            {isNetworkBlocked && (
              <div className="px-6 pb-6 text-center space-y-3">
                <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                  <WifiOff className="h-6 w-6 text-destructive" />
                </div>
                <p className="text-xs text-muted-foreground">{error || "Your network may restrict internet calls."}</p>
                {onFallbackChat && (
                  <button className="w-full inline-flex items-center justify-center gap-2 rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50"
                    onClick={() => { handleEndCall(); onFallbackChat(); }} disabled={isEnding}>
                    <MessageSquare className="h-4 w-4" /> Switch to chat
                  </button>
                )}
                <button className="w-full inline-flex items-center justify-center rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50"
                  onClick={handleEndCall} disabled={isEnding}>Close</button>
              </div>
            )}

            {!isNetworkBlocked && (
              <div className="px-6 pb-8 pt-4">
                <div className="flex items-center justify-center gap-6">
                  <button onClick={handleToggleMute} disabled={status !== "active" || isEnding}
                    className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${muted ? "bg-destructive/10 text-destructive" : "bg-muted text-foreground hover:bg-muted/80"} disabled:opacity-40`}>
                    {muted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                  </button>
                  <button onClick={handleEndCall} disabled={isEnding}
                    className="w-16 h-16 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center hover:bg-destructive/90 transition-colors shadow-lg disabled:opacity-60">
                    {isEnding ? <Loader2 className="h-6 w-6 animate-spin" /> : <PhoneOff className="h-6 w-6" />}
                  </button>
                  <button onClick={handleToggleSpeaker} disabled={status !== "active" || isEnding}
                    className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${!speakerOn ? "bg-destructive/10 text-destructive" : "bg-muted text-foreground hover:bg-muted/80"} disabled:opacity-40`}>
                    {speakerOn ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
                  </button>
                </div>
                <div className="flex items-center justify-center mt-2 gap-6">
                  <span className="text-[10px] text-muted-foreground w-14 text-center">{muted ? "Unmute" : "Mute"}</span>
                  <span className="text-[10px] text-destructive w-16 text-center font-medium">End</span>
                  <span className="text-[10px] text-muted-foreground w-14 text-center">{speakerOn ? "Speaker" : "Earpiece"}</span>
                </div>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

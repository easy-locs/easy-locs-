/**
 * InAppCallDialog — Premium call UI (caller & callee).
 * Audio + video calls with camera feed, speaker/earpiece toggle.
 * Mobile-first, Signal/WhatsApp-grade design. Fully i18n'd.
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  PhoneOff, Mic, MicOff, Volume2, VolumeX, VideoIcon, VideoOff,
  Loader2, Shield, MessageSquare, WifiOff, User, RotateCcw,
} from "lucide-react";
import { CallManager, type CallStatus, type CallState } from "@/lib/call-manager";
import { playSecureCallAnnouncement, resetSecureAudioState } from "@/lib/orbit-secure-audio";
import { useI18n } from "@/lib/i18n";

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
  const { t } = useI18n();
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

  useEffect(() => {
    if (!remoteStream) return;
    const hasVideo = remoteStream.getVideoTracks().length > 0;
    const hasAudio = remoteStream.getAudioTracks().length > 0;
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
    if (hasVideo && remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
      remoteVideoRef.current.play().catch(() => {});
    }
  }, [remoteStream]);

  useEffect(() => {
    if (localStream && localVideoRef.current) {
      localStream.getAudioTracks().forEach((track) => { track.enabled = true; });
      setMuted(false);
      localVideoRef.current.srcObject = localStream;
      localVideoRef.current.play().catch(() => {});
      setVideoEnabled(localStream.getVideoTracks().some(t => t.enabled));
    }
  }, [localStream]);

  const secureAnnouncedRef = useRef(false);

  const handleStateChange = useCallback((state: Partial<CallState>) => {
    if (state.status !== undefined) {
      setStatus(state.status);
      if (state.status === "active" && callManager && !secureAnnouncedRef.current) {
        secureAnnouncedRef.current = true;
        const callId = (callManager as any)?.callId || `call-${Date.now()}`;
        playSecureCallAnnouncement(callId).catch(() => {});
      }
    }
    if (state.elapsed !== undefined) setElapsed(state.elapsed);
    if (state.usingRelay !== undefined) setUsingRelay(state.usingRelay);
    if (state.error !== undefined) setError(state.error);
    if (state.remoteStream !== undefined) setRemoteStream(state.remoteStream);
    if (state.localStream !== undefined) setLocalStream(state.localStream);
    if (state.isVideo !== undefined) {
      setIsVideo(state.isVideo);
      if (state.isVideo) setSpeakerOn(true);
    }
  }, [callManager]);

  useEffect(() => {
    if (callManager) callManager.onStateChange = handleStateChange;
  }, [callManager, handleStateChange]);

  useEffect(() => {
    if (open) {
      setStatus("idle"); setMuted(false); setVideoEnabled(false);
      setElapsed(0); setUsingRelay(false); setError(null);
      setRemoteStream(null); setLocalStream(null); setIsVideo(false); setIsEnding(false); setFacingMode("user");
      setSpeakerOn(false);
      secureAnnouncedRef.current = false;
      resetSecureAudioState();
    }
  }, [open]);

  // Sync audio output routing
  useEffect(() => {
    const audioEl = remoteAudioRef.current;
    if (!audioEl || !remoteStream) return;
    audioEl.volume = 1;
    audioEl.muted = false;
    if ("setSinkId" in audioEl && typeof (audioEl as any).setSinkId === "function") {
      const sinkId = speakerOn ? "default" : "communications";
      (audioEl as any).setSinkId(sinkId).catch(() => {});
    }
  }, [speakerOn, remoteStream]);

  const handleEndCall = async () => {
    if (isEnding) return;
    setIsEnding(true);
    try {
      const s = status as string;
      if (!["ended", "declined", "missed", "failed", "network_blocked"].includes(s)) await callManager?.endCall();
      onClose();
    } finally { setIsEnding(false); }
  };

  const handleToggleMute = useCallback(() => {
    if (!callManager) return;
    const isMuted = callManager.toggleMute();
    setMuted(isMuted);
  }, [callManager]);

  const handleToggleVideo = useCallback(async () => {
    if (!callManager) return;
    if (localStream) {
      const videoTracks = localStream.getVideoTracks();
      if (videoTracks.length > 0) {
        const newEnabled = !videoTracks[0].enabled;
        videoTracks.forEach(t => { t.enabled = newEnabled; });
        setVideoEnabled(newEnabled);
        return;
      }
    }
    try {
      const videoStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 640 }, height: { ideal: 480 } },
      });
      const videoTrack = videoStream.getVideoTracks()[0];
      if (videoTrack && localStream) {
        localStream.addTrack(videoTrack);
        setVideoEnabled(true); setIsVideo(true);
        callManager.addVideoTrack?.(videoTrack);
      } else if (videoTrack) {
        const newStream = new MediaStream([videoTrack]);
        setLocalStream(newStream);
        setVideoEnabled(true); setIsVideo(true);
        callManager.addVideoTrack?.(videoTrack);
      }
    } catch (err) {
      const msg = err instanceof DOMException && err.name === "NotAllowedError"
        ? (t("call.error.camera_denied") || "Camera permission denied.")
        : (t("call.error.camera_failed") || "Could not access camera.");
      setError(msg);
    }
  }, [callManager, localStream, facingMode, t]);

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
      if (oldTrack) { localStream.removeTrack(oldTrack); oldTrack.stop(); }
      if (newTrack) { localStream.addTrack(newTrack); callManager?.replaceVideoTrack?.(newTrack); }
    } catch {}
  };

  const handleToggleSpeaker = useCallback(() => {
    const newState = !speakerOn;
    setSpeakerOn(newState);
    const audioEl = remoteAudioRef.current;
    if (!audioEl) return;
    audioEl.volume = 1; audioEl.muted = false;
    if ("setSinkId" in audioEl && typeof (audioEl as any).setSinkId === "function") {
      const sinkId = newState ? "default" : "communications";
      (audioEl as any).setSinkId(sinkId).catch(() => {
        navigator.mediaDevices?.enumerateDevices?.().then(devices => {
          const earpiece = devices.find(d => d.kind === "audiooutput" && (d.label.toLowerCase().includes("earpiece") || d.label.toLowerCase().includes("écouteur") || d.label.toLowerCase().includes("receiver")));
          const speaker = devices.find(d => d.kind === "audiooutput" && (d.label.toLowerCase().includes("speaker") || d.label.toLowerCase().includes("haut-parleur")));
          const target = newState ? (speaker || { deviceId: "default" }) : (earpiece || { deviceId: "default" });
          (audioEl as any).setSinkId(target.deviceId).catch(() => {});
        }).catch(() => {});
      });
    }
    const nav = navigator as any;
    if (nav?.audioSession && typeof nav.audioSession === "object") {
      try { nav.audioSession.type = newState ? "playback" : "play-and-record"; } catch {}
    }
    try {
      if ((window as any).webkit?.messageHandlers?.audioSession) {
        (window as any).webkit.messageHandlers.audioSession.postMessage({ type: newState ? "speaker" : "receiver" });
      }
    } catch {}
  }, [speakerOn]);

  const fmt = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
  const statusStr = status as string;
  const isNetworkBlocked = statusStr === "network_blocked" || statusStr === "failed";
  const hasRemoteVideo = remoteStream?.getVideoTracks().some(t => t.enabled) || false;
  const showVideoUI = isVideo || hasRemoteVideo || videoEnabled;
  const isTerminal = ["ended", "declined", "missed", "failed", "network_blocked"].includes(statusStr);

  useEffect(() => {
    if (!isTerminal || !open) return;
    const timer = setTimeout(() => { onClose(); }, 3000);
    return () => clearTimeout(timer);
  }, [isTerminal, open, onClose]);

  const statusLabel: Record<string, string> = {
    idle: "",
    ringing: t("call.status.ringing") || "Calling…",
    connecting: t("call.status.connecting") || "Connecting…",
    active: fmt(elapsed),
    ended: t("call.status.ended") || "Call ended",
    declined: t("call.status.declined") || "Call declined",
    missed: t("call.status.missed") || "No answer",
    failed: t("call.status.failed") || "Call failed",
    network_blocked: t("call.status.network_blocked") || "Network restricted",
  };
  const isLoading = status === "ringing" || status === "connecting";
  const label = statusLabel[status] || "";

  const secureLabel = status === "active"
    ? (t("call.label.orbit_secure") || "Orbit Secure")
    : (t("call.label.encrypted") || "Encrypted");

  /** Reusable control button */
  const CtrlBtn = ({ onClick, disabled, active, activeColor, icon, text }: {
    onClick: () => void; disabled?: boolean; active?: boolean;
    activeColor?: string; icon: React.ReactNode; text: string;
  }) => (
    <div className="flex flex-col items-center gap-1.5">
      <button
        onClick={onClick} disabled={disabled}
        className="w-14 h-14 rounded-full flex items-center justify-center transition-all disabled:opacity-40"
        style={{
          background: active ? `hsl(${activeColor || "var(--primary)"} / 0.15)` : "hsl(var(--muted))",
          color: active ? `hsl(${activeColor || "var(--primary)"})` : "hsl(var(--foreground))",
        }}
      >
        {icon}
      </button>
      <span className="text-[10px] font-medium" style={{ color: "hsl(var(--muted-foreground))" }}>{text}</span>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleEndCall()}>
      <DialogContent
        className="p-0 overflow-hidden border-0"
        style={{
          background: "hsl(var(--background))",
          borderRadius: showVideoUI ? 0 : 20,
          maxWidth: showVideoUI ? "100%" : 380,
          maxHeight: "100dvh",
        }}
      >
        <audio ref={remoteAudioRef} autoPlay playsInline />

        {showVideoUI ? (
          /* ═══ VIDEO CALL ═══ */
          <div className="relative" style={{ minHeight: 420 }}>
            <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" style={{ minHeight: 420, background: "hsl(var(--background))" }} />
            {!hasRemoteVideo && (
              <div className="absolute inset-0 flex items-center justify-center" style={{ background: "hsl(var(--background))" }}>
                <div className="text-center">
                  <div className="mx-auto w-24 h-24 rounded-full flex items-center justify-center mb-4" style={{
                    background: "hsl(var(--primary) / 0.06)", border: "2px solid hsl(var(--primary) / 0.12)",
                  }}>
                    <span className="text-4xl font-bold" style={{ color: "hsl(var(--primary) / 0.5)" }}>
                      {(peerName || "?")[0].toUpperCase()}
                    </span>
                  </div>
                  <p className="text-lg font-semibold" style={{ color: "hsl(var(--foreground))" }}>{peerName}</p>
                  <p className="text-sm mt-1.5" style={{ color: "hsl(var(--muted-foreground))" }}>
                    {isLoading && <Loader2 className="h-3 w-3 animate-spin inline mr-1" />}
                    <span className={status === "active" ? "font-mono font-semibold" : ""}>{label}</span>
                  </p>
                </div>
              </div>
            )}

            {/* Self-view PIP */}
            {videoEnabled && (
              <div className="absolute top-4 right-4 w-28 h-40 rounded-2xl overflow-hidden shadow-xl" style={{ border: "2px solid hsl(var(--border) / 0.3)" }}>
                <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover mirror-video" />
                <button onClick={handleFlipCamera}
                  className="absolute bottom-2 right-2 w-7 h-7 rounded-full flex items-center justify-center"
                  style={{ background: "hsl(var(--background) / 0.7)", backdropFilter: "blur(4px)" }}>
                  <RotateCcw className="h-3.5 w-3.5" style={{ color: "hsl(var(--foreground))" }} />
                </button>
              </div>
            )}

            {/* Top badges */}
            <div className="absolute top-4 left-4 flex items-center gap-1.5">
              <div className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium" style={{
                background: "hsl(var(--background) / 0.7)", backdropFilter: "blur(8px)", color: "hsl(142 70% 50%)",
              }}>
                <Shield className="h-2.5 w-2.5" /> {secureLabel}
              </div>
              {status === "active" && (
                <div className="px-2 py-1 rounded-full text-[10px] font-mono font-semibold" style={{
                  background: "hsl(var(--background) / 0.7)", backdropFilter: "blur(8px)", color: "hsl(var(--foreground))",
                }}>{fmt(elapsed)}</div>
              )}
              {usingRelay && status === "active" && (
                <div className="px-2 py-1 rounded-full text-[10px] font-medium" style={{
                  background: "hsl(var(--background) / 0.7)", backdropFilter: "blur(8px)", color: "hsl(38 90% 55%)",
                }}>{t("call.label.relay") || "Relay"}</div>
              )}
            </div>

            {/* Video controls */}
            <div className="absolute bottom-8 left-0 right-0 flex items-center justify-center gap-4">
              <button onClick={handleToggleMute} disabled={isTerminal || isEnding || status === "idle"}
                className="w-12 h-12 rounded-full flex items-center justify-center disabled:opacity-40"
                style={{
                  background: muted ? "hsl(var(--destructive) / 0.8)" : "hsl(var(--background) / 0.6)",
                  backdropFilter: "blur(8px)",
                  color: muted ? "hsl(var(--destructive-foreground))" : "hsl(var(--foreground))",
                }}>
                {muted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              </button>
              <button onClick={handleToggleVideo} disabled={isTerminal || isEnding || status === "idle"}
                className="w-12 h-12 rounded-full flex items-center justify-center disabled:opacity-40"
                style={{
                  background: !videoEnabled ? "hsl(var(--destructive) / 0.8)" : "hsl(var(--background) / 0.6)",
                  backdropFilter: "blur(8px)",
                  color: !videoEnabled ? "hsl(var(--destructive-foreground))" : "hsl(var(--foreground))",
                }}>
                {videoEnabled ? <VideoIcon className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
              </button>
              <button onClick={handleEndCall} disabled={isEnding}
                className="w-16 h-16 rounded-full flex items-center justify-center shadow-lg disabled:opacity-60"
                style={{ background: "hsl(var(--destructive))", color: "hsl(var(--destructive-foreground))" }}>
                {isEnding ? <Loader2 className="h-6 w-6 animate-spin" /> : <PhoneOff className="h-6 w-6" />}
              </button>
              <button onClick={handleToggleSpeaker} disabled={isTerminal || isEnding || status === "idle"}
                className="w-12 h-12 rounded-full flex items-center justify-center disabled:opacity-40"
                style={{
                  background: speakerOn ? "hsl(var(--primary) / 0.2)" : "hsl(var(--background) / 0.6)",
                  backdropFilter: "blur(8px)",
                  color: speakerOn ? "hsl(var(--primary))" : "hsl(var(--foreground))",
                }}>
                {speakerOn ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
              </button>
            </div>
          </div>
        ) : (
          /* ═══ AUDIO CALL ═══ */
          <div className="flex flex-col items-center">
            <div className="pt-12 pb-6 px-8 text-center w-full">
              <div className="mx-auto w-28 h-28 rounded-full flex items-center justify-center mb-6" style={{
                background: "hsl(var(--primary) / 0.06)",
                border: "3px solid hsl(var(--primary) / 0.12)",
                boxShadow: status === "active" ? "0 0 0 8px hsl(var(--primary) / 0.04)" : undefined,
              }}>
                <span className="text-4xl font-bold" style={{ color: "hsl(var(--primary) / 0.5)" }}>
                  {(peerName || "?")[0].toUpperCase()}
                </span>
              </div>

              <p className="text-xl font-bold" style={{ color: "hsl(var(--foreground))" }}>{peerName}</p>
              {contextLabel && <p className="text-xs mt-1 truncate" style={{ color: "hsl(var(--muted-foreground))" }}>{contextLabel}</p>}

              <div className="flex items-center justify-center gap-1.5 mt-3">
                <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium" style={{
                  background: "hsl(142 70% 50% / 0.08)", color: "hsl(142 70% 50%)",
                }}>
                  <Shield className="h-2.5 w-2.5" /> {secureLabel}
                </div>
                {usingRelay && status === "active" && (
                  <div className="inline-flex items-center px-2 py-1 rounded-full text-[10px] font-medium" style={{
                    background: "hsl(38 90% 55% / 0.08)", color: "hsl(38 90% 55%)",
                  }}>{t("call.label.relay") || "Relay"}</div>
                )}
              </div>

              <div className="mt-5 flex items-center justify-center gap-1.5">
                {isLoading && <Loader2 className="h-4 w-4 animate-spin" style={{ color: "hsl(var(--muted-foreground))" }} />}
                <span className={`text-sm ${status === "active" ? "font-mono font-bold text-lg" : ""}`} style={{
                  color: status === "active" ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))",
                }}>{label}</span>
              </div>
            </div>

            {isNetworkBlocked ? (
              <div className="px-8 pb-10 text-center space-y-3 w-full">
                <div className="mx-auto w-14 h-14 rounded-full flex items-center justify-center" style={{ background: "hsl(var(--destructive) / 0.08)" }}>
                  <WifiOff className="h-7 w-7" style={{ color: "hsl(var(--destructive))" }} />
                </div>
                <p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>
                  {error || t("call.network_hint") || "Your network may block internet calls."}
                </p>
                {onFallbackChat && (
                  <button className="w-full inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors"
                    style={{ borderColor: "hsl(var(--border))", color: "hsl(var(--foreground))" }}
                    onClick={() => { handleEndCall(); onFallbackChat(); }} disabled={isEnding}>
                    <MessageSquare className="h-4 w-4" /> {t("call.btn.chat_fallback") || "Switch to chat"}
                  </button>
                )}
                <button className="w-full inline-flex items-center justify-center rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors"
                  style={{ borderColor: "hsl(var(--border))", color: "hsl(var(--foreground))" }}
                  onClick={handleEndCall} disabled={isEnding}>
                  {t("call.btn.close") || "Close"}
                </button>
              </div>
            ) : (
              <div className="px-8 pb-12 pt-4 w-full">
                {isTerminal ? (
                  <div className="flex flex-col items-center gap-4">
                    <div className="mx-auto w-14 h-14 rounded-full flex items-center justify-center" style={{
                      background: statusStr === "failed" ? "hsl(var(--destructive) / 0.08)" : "hsl(var(--muted) / 0.5)",
                    }}>
                      {statusStr === "failed" ? <WifiOff className="h-7 w-7" style={{ color: "hsl(var(--destructive))" }} /> : <PhoneOff className="h-7 w-7" style={{ color: "hsl(var(--muted-foreground))" }} />}
                    </div>
                    <button onClick={onClose}
                      className="w-full max-w-[200px] inline-flex items-center justify-center rounded-xl border px-6 py-3 text-sm font-semibold transition-all active:scale-95"
                      style={{ borderColor: "hsl(var(--border))", color: "hsl(var(--foreground))", background: "hsl(var(--muted) / 0.3)" }}>
                      {t("call.btn.close") || "Close"}
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-6">
                    <CtrlBtn
                      onClick={handleToggleMute}
                      disabled={isTerminal || isEnding || status === "idle"}
                      active={muted}
                      activeColor="var(--destructive)"
                      icon={muted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                      text={muted ? (t("call.btn.unmute") || "Unmute") : (t("call.btn.mute") || "Mute")}
                    />
                    <CtrlBtn
                      onClick={handleToggleVideo}
                      disabled={isTerminal || isEnding || status === "idle"}
                      active={videoEnabled}
                      icon={videoEnabled ? <VideoIcon className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
                      text={t("call.btn.video") || "Video"}
                    />
                    <div className="flex flex-col items-center gap-1.5">
                      <button onClick={handleEndCall} disabled={isEnding}
                        className="w-16 h-16 rounded-full flex items-center justify-center shadow-lg disabled:opacity-60 transition-transform active:scale-95"
                        style={{ background: "hsl(var(--destructive))", color: "hsl(var(--destructive-foreground))" }}>
                        {isEnding ? <Loader2 className="h-6 w-6 animate-spin" /> : <PhoneOff className="h-6 w-6" />}
                      </button>
                      <span className="text-[10px] font-medium" style={{ color: "hsl(var(--destructive))" }}>
                        {t("call.btn.end") || "End"}
                      </span>
                    </div>
                    <CtrlBtn
                      onClick={handleToggleSpeaker}
                      disabled={isTerminal || isEnding || status === "idle"}
                      active={speakerOn}
                      icon={speakerOn ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
                      text={speakerOn ? (t("call.btn.speaker") || "Speaker") : (t("call.btn.earpiece") || "Earpiece")}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/**
 * OrbitCallScreen — WhatsApp-style full-screen call experience.
 * Dark background, large centered avatar, status text, pill-shaped bottom controls.
 */
import { useEffect, useRef, useCallback, useState } from "react";
import {
  Phone, PhoneOff, Mic, MicOff, Volume2, VolumeX,
  VideoIcon, VideoOff, Loader2, MoreHorizontal, UserPlus, Minimize2,
} from "lucide-react";
import { useCallStore, type CallUIState } from "@/stores/orbit/call.store";
import { CallMediaEngine } from "@/families/device/call-media-engine";
import { IdentityAvatar } from "@/components/orbit/IdentityAvatar";
import { useI18n } from "@/lib/i18n";
import { motion, AnimatePresence } from "framer-motion";

export function OrbitCallScreen() {
  const { t } = useI18n();
  const call = useCallStore((s) => s.activeCall);
  const remoteStream = useCallStore((s) => s.remoteStream);
  const toggleMute = useCallStore((s) => s.toggleMute);
  const toggleSpeaker = useCallStore((s) => s.toggleSpeaker);
  const toggleCamera = useCallStore((s) => s.toggleCamera);
  const endCall = useCallStore((s) => s.endCall);
  const reset = useCallStore((s) => s.reset);

  const [isEnding, setIsEnding] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);

  // ── Attach remote stream ──
  useEffect(() => {
    CallMediaEngine.attachRemoteAudio(remoteAudioRef.current, remoteStream || null);
    return () => CallMediaEngine.detachRemoteAudio(remoteAudioRef.current);
  }, [remoteStream]);

  // Auto-dismiss after terminal state
  useEffect(() => {
    if (!call) return;
    const terminal: CallUIState[] = ["ended", "missed", "declined", "failed"];
    if (terminal.includes(call.uiState)) {
      const timer = setTimeout(() => reset(), 3000);
      return () => clearTimeout(timer);
    }
  }, [call?.uiState, reset]);

  // Reset minimized on new call
  useEffect(() => {
    if (call) setMinimized(false);
  }, [call?.callId]);

  const handleHangup = useCallback(async () => {
    if (isEnding) return;
    setIsEnding(true);
    if (useCallStore.getState().activeCall?.uiState === "incoming") {
      window.dispatchEvent(new CustomEvent("orbit:call:decline"));
    } else {
      endCall("ended");
    }
    setTimeout(() => setIsEnding(false), 1000);
  }, [isEnding, endCall]);

  const handleAccept = useCallback(() => {
    window.dispatchEvent(new CustomEvent("orbit:call:accept"));
  }, []);

  const handleMinimize = useCallback(() => {
    setMinimized(true);
  }, []);

  if (!call) return null;
  // When minimized, the MiniPlayer in the chat thread takes over
  if (minimized) return <audio ref={remoteAudioRef} autoPlay playsInline />;

  const isTerminal = ["ended", "missed", "declined", "failed"].includes(call.uiState);
  const isConnecting = ["calling", "ringing", "connecting"].includes(call.uiState);
  const isActive = call.uiState === "active";
  const isIncoming = call.uiState === "incoming";

  const statusLabels: Record<CallUIState, string> = {
    idle: "",
    calling: t("call.status.calling") || "Calling…",
    ringing: t("call.status.ringing") || "Ringing…",
    incoming: t("call.incoming.title") || "Incoming call",
    connecting: t("call.status.connecting") || "Connecting…",
    active: formatElapsed(call.elapsed),
    reconnecting: t("call.label.reconnecting") || "Reconnecting…",
    ended: t("call.status.ended") || "Call ended",
    missed: t("call.status.missed") || "No answer",
    declined: t("call.status.declined") || "Call declined",
    failed: t("call.status.failed") || "Call failed",
  };

  const label = statusLabels[call.uiState] || "";

  return (
    <AnimatePresence>
      <motion.div
        key="call-screen"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[9999] flex flex-col"
        style={{ background: "#111111" }}
      >
        <audio ref={remoteAudioRef} autoPlay playsInline />

        {/* ── Top bar: minimize + name + add contact ── */}
        <div
          className="flex items-center justify-between px-5 shrink-0"
          style={{ paddingTop: "max(env(safe-area-inset-top, 16px), 16px)" }}
        >
          <button
            onClick={handleMinimize}
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ color: "hsl(0 0% 80%)" }}
          >
            <Minimize2 className="h-5 w-5" />
          </button>

          <div className="flex-1 text-center">
            <h1 className="text-lg font-bold tracking-wide" style={{ color: "white" }}>
              {call.peer.name?.toUpperCase()}
            </h1>
            <div className="flex items-center justify-center gap-1.5 mt-0.5">
              {isConnecting && (
                <Loader2 className="h-3 w-3 animate-spin" style={{ color: "hsl(0 0% 60%)" }} />
              )}
              <span
                className={`text-sm ${isActive ? "font-mono font-bold tabular-nums" : ""}`}
                style={{ color: "hsl(0 0% 60%)" }}
              >
                {label}
              </span>
            </div>
          </div>

          <button
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ color: "hsl(0 0% 80%)" }}
          >
            <UserPlus className="h-5 w-5" />
          </button>
        </div>

        {/* ── Center: Large avatar ── */}
        <div className="flex-1 flex items-center justify-center">
          <div className="relative">
            {/* Pulse rings for connecting/incoming */}
            {(isConnecting || isIncoming) && (
              <>
                <div
                  className="absolute inset-[-20px] rounded-full animate-ping opacity-10"
                  style={{
                    background: isIncoming ? "hsl(142 70% 50%)" : "hsl(40 50% 50%)",
                    animationDuration: "2s",
                  }}
                />
                <div
                  className="absolute inset-[-10px] rounded-full animate-pulse opacity-5"
                  style={{
                    background: isIncoming ? "hsl(142 70% 50%)" : "hsl(40 50% 50%)",
                  }}
                />
              </>
            )}

            {/* Avatar circle — WhatsApp gold/brown style */}
            <div
              className="w-44 h-44 rounded-full flex items-center justify-center overflow-hidden"
              style={{
                background: "linear-gradient(145deg, hsl(38 40% 42%), hsl(38 35% 32%))",
              }}
            >
              {call.peer.avatarUrl ? (
                <img
                  src={call.peer.avatarUrl}
                  alt={call.peer.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <svg viewBox="0 0 24 24" className="w-20 h-20" fill="none">
                  <circle cx="12" cy="8" r="4" fill="hsl(40 40% 70%)" />
                  <path
                    d="M4 20c0-3.3 3.6-6 8-6s8 2.7 8 6"
                    fill="hsl(40 40% 70%)"
                  />
                </svg>
              )}
            </div>
          </div>
        </div>

        {/* Error message */}
        {call.error && (
          <div className="px-8 pb-4 text-center">
            <p
              className="text-xs px-4 py-2 rounded-lg inline-block"
              style={{ background: "hsl(0 60% 50% / 0.2)", color: "hsl(0 70% 65%)" }}
            >
              {call.error}
            </p>
          </div>
        )}

        {/* ── Bottom controls ── */}
        <div
          className="shrink-0 px-6"
          style={{ paddingBottom: "max(env(safe-area-inset-bottom, 28px), 28px)" }}
        >
          {isIncoming ? (
            /* Incoming: decline + accept */
            <div className="flex items-center justify-center gap-16">
              <div className="flex flex-col items-center gap-2">
                <button
                  onClick={handleHangup}
                  className="w-16 h-16 rounded-full flex items-center justify-center transition-transform active:scale-95"
                  style={{ background: "hsl(0 72% 51%)" }}
                >
                  <PhoneOff className="h-6 w-6" style={{ color: "white" }} />
                </button>
                <span className="text-[10px] font-medium" style={{ color: "hsl(0 72% 51%)" }}>
                  Decline
                </span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <button
                  onClick={handleAccept}
                  className="w-16 h-16 rounded-full flex items-center justify-center transition-transform active:scale-95"
                  style={{ background: "hsl(142 70% 45%)" }}
                >
                  <Phone className="h-6 w-6" style={{ color: "white" }} />
                </button>
                <span className="text-[10px] font-semibold" style={{ color: "hsl(142 70% 45%)" }}>
                  Accept
                </span>
              </div>
            </div>
          ) : isTerminal ? (
            <div className="flex justify-center">
              <button
                onClick={() => reset()}
                className="px-10 py-3.5 rounded-2xl text-sm font-semibold transition-all active:scale-95"
                style={{ background: "hsl(0 0% 20%)", color: "white" }}
              >
                Close
              </button>
            </div>
          ) : (
            /* Active/connecting: pill-shaped control bar */
            <div
              className="flex items-center justify-center gap-1 px-3 py-2.5 mx-auto rounded-full"
              style={{
                background: "hsl(0 0% 18%)",
                maxWidth: "360px",
              }}
            >
              {/* More options */}
              <CallControlBtn
                onClick={() => {}}
                icon={<MoreHorizontal className="h-5 w-5" />}
                style={{ color: "white", background: "hsl(0 0% 28%)" }}
              />

              {/* Video toggle */}
              <CallControlBtn
                onClick={toggleCamera}
                icon={call.cameraOn ? <VideoIcon className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
                style={{
                  color: "white",
                  background: call.cameraOn ? "hsl(0 0% 28%)" : "hsl(0 0% 22%)",
                }}
              />

              {/* Speaker */}
              <CallControlBtn
                onClick={toggleSpeaker}
                active={call.speakerOn}
                icon={call.speakerOn ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
                style={{
                  color: call.speakerOn ? "hsl(0 0% 10%)" : "white",
                  background: call.speakerOn ? "white" : "hsl(0 0% 28%)",
                }}
              />

              {/* Mute */}
              <CallControlBtn
                onClick={toggleMute}
                icon={call.muted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                style={{
                  color: "white",
                  background: call.muted ? "hsl(0 60% 50%)" : "hsl(0 0% 28%)",
                }}
              />

              {/* Hangup — red */}
              <button
                onClick={handleHangup}
                disabled={isEnding}
                className="w-14 h-14 rounded-full flex items-center justify-center transition-transform active:scale-95 disabled:opacity-60"
                style={{ background: "hsl(0 72% 51%)" }}
              >
                {isEnding ? (
                  <Loader2 className="h-5 w-5 animate-spin" style={{ color: "white" }} />
                ) : (
                  <PhoneOff className="h-5 w-5" style={{ color: "white" }} />
                )}
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

function CallControlBtn({
  onClick,
  icon,
  active,
  style,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  active?: boolean;
  style?: React.CSSProperties;
}) {
  return (
    <button
      onClick={onClick}
      className="w-12 h-12 rounded-full flex items-center justify-center transition-all active:scale-95"
      style={style}
    >
      {icon}
    </button>
  );
}

function formatElapsed(s: number): string {
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
}

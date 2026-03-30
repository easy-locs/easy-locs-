/**
 * OrbitCallScreen — Full-screen canonical call experience.
 * Covers the entire viewport when a call is active.
 * Displays: peer identity, call state, controls, elapsed time.
 * Handles: audio/video, mute, speaker, camera, hangup.
 *
 * PHASE 3: Wires remoteStream to <audio> element for actual audio playback.
 */
import { useEffect, useRef, useCallback, useState } from "react";
import {
  Phone, PhoneOff, Mic, MicOff, Volume2, VolumeX,
  VideoIcon, VideoOff, Loader2, Shield,
} from "lucide-react";
import { useCallStore, type CallUIState } from "@/stores/orbit/call.store";
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
  const remoteAudioRef = useRef<HTMLAudioElement>(null);

  // ── CRITICAL: Attach remote stream to audio element for playback ──
  useEffect(() => {
    const audioEl = remoteAudioRef.current;
    if (!audioEl) return;

    if (remoteStream && remoteStream.getAudioTracks().length > 0) {
      audioEl.srcObject = remoteStream;
      // Force play (handle autoplay restrictions)
      audioEl.play().catch((err) => {
        console.warn("[OrbitCallScreen] autoplay blocked, retrying on user gesture:", err);
      });
    } else {
      audioEl.srcObject = null;
    }

    return () => {
      audioEl.srcObject = null;
    };
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

  const handleHangup = useCallback(async () => {
    if (isEnding) return;
    setIsEnding(true);
    endCall("ended");
    setTimeout(() => setIsEnding(false), 1000);
  }, [isEnding, endCall]);

  const handleAccept = useCallback(() => {
    // Accept is handled by CallProvider via the IncomingCallDialog
    // When OrbitCallScreen shows "incoming", the accept action
    // must be dispatched through the canonical pipeline.
    // The CallProvider bridges the accept action.
    const store = useCallStore.getState();
    // Emit a custom event that CallProvider listens to
    window.dispatchEvent(new CustomEvent("orbit:call:accept"));
  }, []);

  if (!call) return null;

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
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        transition={{ duration: 0.25 }}
        className="fixed inset-0 z-[9999] flex flex-col"
        style={{
          background: "linear-gradient(180deg, hsl(var(--background)) 0%, hsl(var(--muted)) 100%)",
        }}
      >
        {/* Hidden audio element for remote stream playback */}
        <audio ref={remoteAudioRef} autoPlay playsInline />

        {/* ── Top bar ── */}
        <div className="flex items-center justify-between px-5 pt-safe-area-top" style={{ paddingTop: "max(env(safe-area-inset-top, 12px), 12px)" }}>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium"
            style={{ background: "hsl(142 70% 50% / 0.08)", color: "hsl(142 70% 50%)" }}>
            <Shield className="h-2.5 w-2.5" />
            {isActive ? (t("call.label.orbit_secure") || "Orbit Secure") : (t("call.label.encrypted") || "Encrypted")}
          </div>
          {call.mode === "video" && (
            <span className="text-[10px] font-medium px-2 py-1 rounded-full"
              style={{ background: "hsl(var(--primary) / 0.08)", color: "hsl(var(--primary))" }}>
              <VideoIcon className="h-3 w-3 inline mr-1" />Video
            </span>
          )}
        </div>

        {/* ── Central content ── */}
        <div className="flex-1 flex flex-col items-center justify-center px-8">
          <div className="relative mb-8">
            {isConnecting && (
              <>
                <div className="absolute inset-[-24px] rounded-full animate-ping opacity-20"
                  style={{ background: "hsl(var(--primary))", animationDuration: "2s" }} />
                <div className="absolute inset-[-12px] rounded-full animate-pulse opacity-10"
                  style={{ background: "hsl(var(--primary))" }} />
              </>
            )}
            {isIncoming && (
              <>
                <div className="absolute inset-[-24px] rounded-full animate-ping opacity-20"
                  style={{ background: "hsl(142 70% 50%)", animationDuration: "2s" }} />
                <div className="absolute inset-[-12px] rounded-full animate-pulse opacity-10"
                  style={{ background: "hsl(142 70% 50%)" }} />
              </>
            )}
            {isActive && (
              <div className="absolute inset-[-6px] rounded-full"
                style={{ boxShadow: "0 0 0 3px hsl(var(--primary) / 0.1)" }} />
            )}
            <div className="relative w-32 h-32 rounded-full flex items-center justify-center overflow-hidden"
              style={{
                background: "hsl(var(--primary) / 0.06)",
                border: `3px solid hsl(var(--primary) / ${isActive ? 0.25 : 0.12})`,
              }}>
              <IdentityAvatar name={call.peer.name} size="xl" />
            </div>
          </div>

          <h1 className="text-2xl font-bold mb-1" style={{ color: "hsl(var(--foreground))" }}>
            {call.peer.name}
          </h1>

          <div className="flex items-center gap-2 mb-2">
            {isConnecting && <Loader2 className="h-4 w-4 animate-spin" style={{ color: "hsl(var(--muted-foreground))" }} />}
            <span className={`text-sm ${isActive ? "font-mono font-bold text-lg tabular-nums" : ""}`}
              style={{ color: isActive ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))" }}>
              {label}
            </span>
          </div>

          {call.error && (
            <p className="text-xs px-4 py-2 rounded-lg mt-2 text-center"
              style={{ background: "hsl(var(--destructive) / 0.08)", color: "hsl(var(--destructive))" }}>
              {call.error}
            </p>
          )}
        </div>

        {/* ── Controls ── */}
        <div className="pb-safe-area-bottom px-8" style={{ paddingBottom: "max(env(safe-area-inset-bottom, 32px), 32px)" }}>
          {isIncoming ? (
            <div className="flex items-center justify-center gap-16">
              <div className="flex flex-col items-center gap-2">
                <button onClick={handleHangup}
                  className="w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-95"
                  style={{ background: "hsl(var(--destructive))", color: "hsl(var(--destructive-foreground))" }}>
                  <PhoneOff className="h-6 w-6" />
                </button>
                <span className="text-[10px] font-medium" style={{ color: "hsl(var(--destructive))" }}>
                  {t("call.incoming.decline") || "Decline"}
                </span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <button
                  onClick={handleAccept}
                  className="w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-95"
                  style={{ background: "hsl(142 70% 45%)", color: "white" }}>
                  <Phone className="h-6 w-6" />
                </button>
                <span className="text-[10px] font-semibold" style={{ color: "hsl(142 70% 45%)" }}>
                  {t("call.incoming.accept") || "Accept"}
                </span>
              </div>
            </div>
          ) : isTerminal ? (
            <div className="flex justify-center">
              <button onClick={() => reset()}
                className="px-8 py-3 rounded-xl text-sm font-semibold transition-all active:scale-95"
                style={{ background: "hsl(var(--muted))", color: "hsl(var(--foreground))" }}>
                {t("call.btn.close") || "Close"}
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-5">
              <ControlButton
                onClick={toggleMute}
                active={call.muted}
                activeColor="var(--destructive)"
                disabled={isConnecting}
                icon={call.muted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                label={call.muted ? (t("call.btn.unmute") || "Unmute") : (t("call.btn.mute") || "Mute")}
              />
              <ControlButton
                onClick={toggleSpeaker}
                active={call.speakerOn}
                disabled={isConnecting}
                icon={call.speakerOn ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
                label={call.speakerOn ? (t("call.btn.speaker") || "Speaker") : (t("call.btn.earpiece") || "Earpiece")}
              />
              <div className="flex flex-col items-center gap-1.5">
                <button onClick={handleHangup} disabled={isEnding}
                  className="w-16 h-16 rounded-full flex items-center justify-center shadow-lg disabled:opacity-60 transition-transform active:scale-95"
                  style={{ background: "hsl(var(--destructive))", color: "hsl(var(--destructive-foreground))" }}>
                  {isEnding ? <Loader2 className="h-6 w-6 animate-spin" /> : <PhoneOff className="h-6 w-6" />}
                </button>
                <span className="text-[10px] font-medium" style={{ color: "hsl(var(--destructive))" }}>
                  {t("call.btn.end") || "End"}
                </span>
              </div>
              {call.mode === "video" && (
                <ControlButton
                  onClick={toggleCamera}
                  active={call.cameraOn}
                  disabled={isConnecting}
                  icon={call.cameraOn ? <VideoIcon className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
                  label={t("call.btn.video") || "Video"}
                />
              )}
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

function ControlButton({ onClick, active, activeColor, disabled, icon, label }: {
  onClick: () => void; active?: boolean; activeColor?: string;
  disabled?: boolean; icon: React.ReactNode; label: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <button onClick={onClick} disabled={disabled}
        className="w-14 h-14 rounded-full flex items-center justify-center transition-all disabled:opacity-40"
        style={{
          background: active ? `hsl(${activeColor || "var(--primary)"} / 0.15)` : "hsl(var(--muted))",
          color: active ? `hsl(${activeColor || "var(--primary)"})` : "hsl(var(--foreground))",
        }}>
        {icon}
      </button>
      <span className="text-[10px] font-medium" style={{ color: "hsl(var(--muted-foreground))" }}>{label}</span>
    </div>
  );
}

function formatElapsed(s: number): string {
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
}

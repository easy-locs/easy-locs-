/**
 * OrbitCallScreen — WhatsApp-style full-screen call experience.
 * Dark background, large centered avatar, status text, pill-shaped bottom controls.
 * PHASE 6: Full video rendering — local PiP + remote fullscreen.
 */
import { useEffect, useRef, useCallback, useState } from "react";
import {
  Phone, PhoneOff, Mic, MicOff, Volume2, VolumeX,
  VideoIcon, VideoOff, Loader2, MoreHorizontal, UserPlus, Minimize2,
  SwitchCamera, Search, X, Check, MonitorUp, MessageCircle, Lock,
  Circle, Bluetooth, Pause, Play,
} from "lucide-react";
import { useCallStore, type CallUIState } from "@/stores/orbit/call.store";
import { CallMediaEngine } from "@/families/device/call-media-engine";
import { IdentityAvatar } from "@/components/orbit/IdentityAvatar";
import { useI18n } from "@/lib/i18n";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { listOrbitContacts } from "@/lib/orbit/orbit-contacts-service";
import { toast } from "sonner";

export function OrbitCallScreen() {
  const { t } = useI18n();
  const call = useCallStore((s) => s.activeCall);
  const remoteStream = useCallStore((s) => s.remoteStream);
  const localStream = useCallStore((s) => s.localStream);
  const toggleMute = useCallStore((s) => s.toggleMute);
  const toggleSpeaker = useCallStore((s) => s.toggleSpeaker);
  const toggleCamera = useCallStore((s) => s.toggleCamera);
  const endCall = useCallStore((s) => s.endCall);
  const reset = useCallStore((s) => s.reset);

  const [isEnding, setIsEnding] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [pipPosition, setPipPosition] = useState<"top-right" | "top-left" | "bottom-right" | "bottom-left">("top-right");
  const [showAddParticipant, setShowAddParticipant] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [isOnHold, setIsOnHold] = useState(false);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);

  // ── Attach remote stream to audio element ──
  useEffect(() => {
    CallMediaEngine.attachRemoteAudio(remoteAudioRef.current, remoteStream || null);
    return () => CallMediaEngine.detachRemoteAudio(remoteAudioRef.current);
  }, [remoteStream]);

  // ── Attach remote stream to video element ──
  useEffect(() => {
    const el = remoteVideoRef.current;
    if (!el) return;
    if (remoteStream && remoteStream.getVideoTracks().length > 0) {
      el.srcObject = remoteStream;
      el.play().catch(() => {});
    } else {
      el.srcObject = null;
    }
    return () => { el.srcObject = null; };
  }, [remoteStream]);

  // ── Attach local stream to PiP video element ──
  useEffect(() => {
    const el = localVideoRef.current;
    if (!el) return;
    if (localStream && localStream.getVideoTracks().length > 0) {
      el.srcObject = localStream;
      el.play().catch(() => {});
    } else {
      el.srcObject = null;
    }
    return () => { el.srcObject = null; };
  }, [localStream]);

  // NOTE: Reset after terminal states is handled by CallProvider (3.5s delay).
  // OrbitCallScreen does NOT self-reset to avoid double-reset race conditions.

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

  const cyclePipPosition = useCallback(() => {
    setPipPosition((p) => {
      const order: typeof p[] = ["top-right", "top-left", "bottom-left", "bottom-right"];
      const idx = order.indexOf(p);
      return order[(idx + 1) % order.length];
    });
  }, []);

  if (!call) return null;
  if (minimized) return <audio ref={remoteAudioRef} autoPlay playsInline />;

  const isTerminal = ["ended", "missed", "declined", "failed"].includes(call.uiState);
  const isConnecting = ["calling", "ringing", "connecting"].includes(call.uiState);
  const isActive = call.uiState === "active";
  const isIncoming = call.uiState === "incoming";
  const isVideoCall = call.mode === "video";

  const hasRemoteVideo = isVideoCall && remoteStream && remoteStream.getVideoTracks().some((t) => t.enabled && !t.muted);
  const hasLocalVideo = isVideoCall && call.cameraOn && localStream && localStream.getVideoTracks().length > 0;

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

  const pipPositionStyles: Record<string, React.CSSProperties> = {
    "top-right": { top: 80, right: 16 },
    "top-left": { top: 80, left: 16 },
    "bottom-right": { bottom: 160, right: 16 },
    "bottom-left": { bottom: 160, left: 16 },
  };

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

        {/* ── Remote video (fullscreen background) ── */}
        {isVideoCall && (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
            style={{
              opacity: hasRemoteVideo ? 1 : 0,
              transition: "opacity 0.3s ease",
              zIndex: 0,
            }}
          />
        )}

        {/* ── Local video PiP ── */}
        {isVideoCall && hasLocalVideo && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.25 }}
            onClick={cyclePipPosition}
            className="absolute z-30 rounded-2xl overflow-hidden shadow-2xl border-2"
            style={{
              width: 120,
              height: 160,
              borderColor: "hsl(0 0% 30%)",
              cursor: "pointer",
              ...pipPositionStyles[pipPosition],
            }}
          >
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
              style={{ transform: "scaleX(-1)" }}
            />
            <div
              className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[10px] font-medium px-1.5 py-0.5 rounded-full"
              style={{ background: "hsl(0 0% 0% / 0.5)", color: "white" }}
            >
              You
            </div>
          </motion.div>
        )}

        {/* ── Top bar: minimize + name + camera switch ── */}
        <div
          className="relative z-20 flex items-center justify-between px-5 shrink-0"
          style={{ paddingTop: "max(env(safe-area-inset-top, 16px), 16px)" }}
        >
          <button
            onClick={handleMinimize}
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ color: "hsl(0 0% 80%)", background: "hsl(0 0% 0% / 0.3)" }}
          >
            <Minimize2 className="h-5 w-5" />
          </button>

          <div className="flex-1 text-center">
            <h1 className="text-lg font-bold tracking-wide" style={{ color: "white", textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}>
              {call.peer.name?.toUpperCase()}
            </h1>
            <div className="flex items-center justify-center gap-1.5 mt-0.5">
              {isConnecting && (
                <Loader2 className="h-3 w-3 animate-spin" style={{ color: "hsl(0 0% 60%)" }} />
              )}
              <span
                className={`text-sm ${isActive ? "font-mono font-bold tabular-nums" : ""}`}
                style={{ color: "hsl(0 0% 80%)", textShadow: "0 1px 3px rgba(0,0,0,0.4)" }}
              >
                {label}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {isVideoCall && (
              <button
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ color: "hsl(0 0% 80%)", background: "hsl(0 0% 0% / 0.3)" }}
              >
                <SwitchCamera className="h-5 w-5" />
              </button>
            )}
            <button
              onClick={() => setShowAddParticipant(true)}
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ color: "hsl(0 0% 80%)", background: "hsl(0 0% 0% / 0.3)" }}
            >
              <UserPlus className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* ── Center: Large avatar (visible when no remote video or audio-only) ── */}
        {(!hasRemoteVideo || !isVideoCall) && (
          <div className="relative z-10 flex-1 flex items-center justify-center">
            <div className="relative">
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
                    <path d="M4 20c0-3.3 3.6-6 8-6s8 2.7 8 6" fill="hsl(40 40% 70%)" />
                  </svg>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Spacer when video is showing */}
        {hasRemoteVideo && isVideoCall && <div className="flex-1" />}

        {/* Error message */}
        {call.error && (
          <div className="relative z-20 px-8 pb-4 text-center">
            <p
              className="text-xs px-4 py-2 rounded-lg inline-block"
              style={{ background: "hsl(0 60% 50% / 0.2)", color: "hsl(0 70% 65%)" }}
            >
              {call.error}
            </p>
          </div>
        )}

        {/* E2EE badge */}
        {isActive && (
          <div className="relative z-20 flex justify-center pb-3">
            <div
              className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-medium"
              style={{ background: "hsl(142 60% 40% / 0.15)", color: "hsl(142 70% 65%)" }}
            >
              <svg className="w-3 h-3" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 1a4 4 0 0 0-4 4v2H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1h-1V5a4 4 0 0 0-4-4zm2 6H6V5a2 2 0 1 1 4 0v2z" />
              </svg>
              End-to-end encrypted
            </div>
          </div>
        )}

        {showAddParticipant && (
          <AddParticipantPanel
            currentPeerId={call.peer.userId}
            onClose={() => setShowAddParticipant(false)}
            onAdd={(contact) => {
              toast.success(`${contact.name} added to call`);
              setShowAddParticipant(false);
            }}
          />
        )}

        {showMoreMenu && !isIncoming && !isTerminal && (
          <>
            <div className="absolute inset-0" style={{ zIndex: 25 }} onClick={() => setShowMoreMenu(false)} />
            <CallMoreMenu
              isOnHold={isOnHold}
              isVideoCall={isVideoCall}
              onToggleHold={() => { setIsOnHold(!isOnHold); toast.info(isOnHold ? "Call resumed" : "Call on hold"); }}
              onAddParticipant={() => { setShowMoreMenu(false); setShowAddParticipant(true); }}
              onClose={() => setShowMoreMenu(false)}
            />
          </>
        )}

        {/* ── Hold indicator ── */}
        {isOnHold && isActive && (
          <div className="relative z-20 flex justify-center pb-2">
            <div className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[11px] font-semibold"
              style={{ background: "hsl(45 90% 50% / 0.2)", color: "hsl(45 90% 65%)" }}>
              <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: "hsl(45 90% 55%)" }} />
              On Hold
            </div>
          </div>
        )}

        {/* ── Bottom controls ── */}
        <div
          className="relative z-20 shrink-0 px-6"
          style={{ paddingBottom: "max(env(safe-area-inset-bottom, 28px), 28px)" }}
        >
          {isIncoming ? (
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
            <div
              className="flex items-center justify-center gap-1 px-3 py-2.5 mx-auto rounded-full"
              style={{
                background: "hsl(0 0% 10% / 0.85)",
                backdropFilter: "blur(16px)",
                maxWidth: "380px",
              }}
            >
              <CallControlBtn
                onClick={() => setShowMoreMenu(!showMoreMenu)}
                icon={<MoreHorizontal className="h-5 w-5" />}
                style={{ color: "white", background: showMoreMenu ? "hsl(0 0% 40%)" : "hsl(0 0% 28%)" }}
              />

              <CallControlBtn
                onClick={toggleCamera}
                icon={call.cameraOn ? <VideoIcon className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
                style={{
                  color: call.cameraOn ? "hsl(0 0% 10%)" : "white",
                  background: call.cameraOn ? "white" : "hsl(0 0% 22%)",
                }}
              />

              <CallControlBtn
                onClick={toggleSpeaker}
                active={call.speakerOn}
                icon={call.speakerOn ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
                style={{
                  color: call.speakerOn ? "hsl(0 0% 10%)" : "white",
                  background: call.speakerOn ? "white" : "hsl(0 0% 28%)",
                }}
              />

              <CallControlBtn
                onClick={toggleMute}
                icon={call.muted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                style={{
                  color: "white",
                  background: call.muted ? "hsl(0 60% 50%)" : "hsl(0 0% 28%)",
                }}
              />

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

function CallMoreMenu({
  isOnHold,
  isVideoCall,
  onToggleHold,
  onAddParticipant,
  onClose,
}: {
  isOnHold: boolean;
  isVideoCall: boolean;
  onToggleHold: () => void;
  onAddParticipant: () => void;
  onClose: () => void;
}) {
  const [isRecording, setIsRecording] = useState(false);
  const { t } = useI18n();

  const MenuRow = ({ label, icon, onClick, danger }: { label: string; icon: React.ReactNode; onClick: () => void; danger?: boolean }) => (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between px-5 py-3 text-left transition-colors hover:bg-white/5 active:bg-white/10"
    >
      <span className="text-[14.5px] font-medium" style={{ color: danger ? "hsl(0 70% 60%)" : "white" }}>{label}</span>
      {icon}
    </button>
  );

  const Divider = () => <div className="mx-5 h-px" style={{ background: "hsl(0 0% 25%)" }} />;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.15 }}
      className="absolute inset-x-4 z-30 rounded-2xl overflow-hidden"
      style={{ bottom: 110, background: "hsl(0 0% 16% / 0.97)", backdropFilter: "blur(24px)" }}
    >
      <div className="flex items-center gap-2 px-5 pt-3.5 pb-1.5">
        <Lock className="h-3 w-3" style={{ color: "hsl(0 0% 55%)" }} />
        <span className="text-[11px] font-medium" style={{ color: "hsl(0 0% 55%)" }}>
          End-to-end encrypted
        </span>
        <div className="flex-1" />
        <button onClick={onClose} className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "hsl(0 0% 25%)" }}>
          <X className="h-3.5 w-3.5" style={{ color: "white" }} />
        </button>
      </div>

      <div className="pb-2">
        <MenuRow
          label={isOnHold ? t("call.menu.resume") : t("call.menu.hold")}
          icon={isOnHold
            ? <Play className="h-4.5 w-4.5" style={{ color: "hsl(142 60% 55%)" }} />
            : <Pause className="h-4.5 w-4.5" style={{ color: "hsl(0 0% 60%)" }} />
          }
          onClick={() => { onToggleHold(); onClose(); }}
        />
        <Divider />
        <MenuRow
          label={isRecording ? t("call.menu.stop_recording") : t("call.menu.record")}
          icon={<Circle className="h-4.5 w-4.5" style={{ color: isRecording ? "hsl(0 72% 55%)" : "hsl(0 0% 60%)", fill: isRecording ? "hsl(0 72% 55%)" : "none" }} />}
          onClick={() => { setIsRecording(!isRecording); toast.info(isRecording ? t("call.menu.recording_stopped") : t("call.menu.recording_started")); onClose(); }}
          danger={isRecording}
        />
        <Divider />
        <MenuRow
          label={t("call.menu.share_screen")}
          icon={<MonitorUp className="h-4.5 w-4.5" style={{ color: "hsl(0 0% 60%)" }} />}
          onClick={() => { toast.info(t("call.menu.sharing_screen")); onClose(); }}
        />
        <Divider />
        {isVideoCall && (
          <>
            <MenuRow
              label={t("call.menu.flip_camera")}
              icon={<SwitchCamera className="h-4.5 w-4.5" style={{ color: "hsl(0 0% 60%)" }} />}
              onClick={() => { toast.info(t("call.menu.camera_flipped")); onClose(); }}
            />
            <Divider />
          </>
        )}
        <MenuRow
          label={t("call.menu.audio_output")}
          icon={<Bluetooth className="h-4.5 w-4.5" style={{ color: "hsl(0 0% 60%)" }} />}
          onClick={() => { toast.info(t("call.menu.audio_output")); onClose(); }}
        />
        <Divider />
        <MenuRow
          label={t("call.menu.send_message")}
          icon={<MessageCircle className="h-4.5 w-4.5" style={{ color: "hsl(0 0% 60%)" }} />}
          onClick={() => { toast.info(t("call.menu.opening_message")); onClose(); }}
        />
        <Divider />
        <MenuRow
          label={t("call.menu.add_participant")}
          icon={<UserPlus className="h-4.5 w-4.5" style={{ color: "hsl(0 0% 60%)" }} />}
          onClick={onAddParticipant}
        />
      </div>
    </motion.div>
  );
}

function AddParticipantPanel({
  currentPeerId,
  onClose,
  onAdd,
}: {
  currentPeerId: string;
  onClose: () => void;
  onAdd: (contact: { id: string; name: string; orbitId?: string }) => void;
}) {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    (async () => {
      try {
        if (!user) return;
        const list = await listOrbitContacts(user.id);
        setContacts(list.filter((c: any) => c.peer_user_id !== currentPeerId));
      } catch {}
      setLoading(false);
    })();
  }, [currentPeerId]);

  const filtered = contacts.filter((c: any) => {
    if (!search) return true;
    const q = search.toLowerCase();
    const name = (c.display_name || c.name || "").toLowerCase();
    return name.includes(q);
  });

  const frequentContacts = filtered.slice(0, 7);

  const alphabetical: Record<string, any[]> = {};
  filtered.forEach((c: any) => {
    const name = (c.display_name || c.name || "?");
    const letter = name[0]?.toUpperCase() || "#";
    if (!alphabetical[letter]) alphabetical[letter] = [];
    alphabetical[letter].push(c);
  });
  const sortedLetters = Object.keys(alphabetical).sort();
  const allLetters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ#".split("");

  const toggleSelect = (c: any) => {
    const targetId = c.peer_user_id || c.contact_user_id;
    if (!targetId) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(targetId)) next.delete(targetId);
      else next.add(targetId);
      return next;
    });
  };

  const handleConfirm = () => {
    selected.forEach((id) => {
      const c = contacts.find((ct: any) => (ct.peer_user_id || ct.contact_user_id) === id);
      if (c) onAdd({ id, name: c.display_name || c.name || "Contact", orbitId: c.peer_orbit_id });
    });
  };

  const renderContactRow = (c: any) => {
    const targetId = c.peer_user_id || c.contact_user_id;
    const isSelected = targetId ? selected.has(targetId) : false;
    return (
      <button
        key={c.id}
        onClick={() => toggleSelect(c)}
        className="w-full flex items-center gap-3 px-4 py-3 transition-colors hover:bg-white/5 active:bg-white/8"
      >
        <IdentityAvatar name={c.display_name || c.name || "?"} avatarUrl={c.avatar_url} size="sm" />
        <div className="flex-1 min-w-0 text-left">
          <p className="text-[14px] font-medium truncate" style={{ color: "white" }}>{c.display_name || c.name}</p>
        </div>
        <div
          className="w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors"
          style={{
            borderColor: isSelected ? "hsl(142 70% 50%)" : "hsl(0 0% 35%)",
            background: isSelected ? "hsl(142 70% 50%)" : "transparent",
          }}
        >
          {isSelected && <Check className="h-3.5 w-3.5" style={{ color: "white" }} />}
        </div>
      </button>
    );
  };

  return (
    <motion.div
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ type: "spring", damping: 25, stiffness: 300 }}
      className="absolute inset-0 z-40 flex flex-col"
      style={{ background: "hsl(0 0% 8%)" }}
    >
      <div className="flex items-center justify-between px-5 pt-[max(env(safe-area-inset-top,16px),16px)] pb-2">
        <div>
          <h3 className="text-base font-semibold" style={{ color: "white" }}>Add people</h3>
          <p className="text-xs" style={{ color: "hsl(0 0% 50%)" }}>
            {selected.size}/{contacts.length}
          </p>
        </div>
        <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "hsl(0 0% 20%)" }}>
          <X className="h-4 w-4" style={{ color: "white" }} />
        </button>
      </div>

      <div className="px-4 pb-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "hsl(0 0% 50%)" }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm border-0 outline-none"
            style={{ background: "hsl(0 0% 15%)", color: "white" }}
            autoFocus
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto relative">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin" style={{ color: "hsl(0 0% 50%)" }} />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center py-12 text-sm" style={{ color: "hsl(0 0% 50%)" }}>
            {search ? "No matching contacts" : "No contacts available"}
          </p>
        ) : (
          <div className="pb-20">
            {!search && frequentContacts.length > 0 && (
              <>
                <p className="px-4 pt-3 pb-1 text-xs font-semibold italic" style={{ color: "hsl(0 0% 45%)" }}>
                  Frequently contacted
                </p>
                {frequentContacts.map(renderContactRow)}
              </>
            )}

            {sortedLetters.map((letter) => (
              <div key={letter} id={`letter-${letter}`}>
                <p className="px-4 pt-4 pb-1 text-[13px] font-bold" style={{ color: "hsl(0 0% 40%)" }}>
                  {letter}
                </p>
                {alphabetical[letter].map(renderContactRow)}
              </div>
            ))}
          </div>
        )}

        <div
          className="absolute right-0 top-0 bottom-0 flex flex-col items-center justify-center px-1 select-none"
          style={{ fontSize: "8px", lineHeight: "11px", color: "hsl(var(--primary))" }}
        >
          {allLetters.map((l) => (
            <a
              key={l}
              href={`#letter-${l}`}
              className="hover:font-bold transition-all"
              onClick={(e) => {
                e.preventDefault();
                document.getElementById(`letter-${l}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
            >
              {l}
            </a>
          ))}
        </div>
      </div>

      {selected.size > 0 && (
        <div className="shrink-0 px-5 py-3 border-t" style={{ borderColor: "hsl(0 0% 18%)", background: "hsl(0 0% 10%)" }}>
          <button
            onClick={handleConfirm}
            className="w-full py-3 rounded-xl text-sm font-semibold transition-all active:scale-[0.98]"
            style={{ background: "hsl(142 70% 45%)", color: "white" }}
          >
            Add {selected.size} {selected.size === 1 ? "person" : "people"}
          </button>
        </div>
      )}
    </motion.div>
  );
}

function formatElapsed(s: number): string {
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
}

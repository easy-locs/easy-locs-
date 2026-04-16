import { useEffect, useRef, useCallback, useState } from "react";
import {
  Phone, PhoneOff, Mic, MicOff, Volume2, VolumeX,
  VideoIcon, VideoOff, Loader2, MonitorUp, Users,
  Circle, X, Maximize2, Minimize2,
} from "lucide-react";
import { useGroupCallStore } from "@/stores/orbit/group-call.store";
import { useI18n } from "@/lib/i18n";
import { motion, AnimatePresence } from "framer-motion";
import { IdentityAvatar } from "@/components/orbit/IdentityAvatar";
import type { GroupCallParticipant } from "@/lib/call/group-call-types";

function formatElapsed(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
}

function getGridClass(count: number): string {
  if (count <= 1) return "grid-cols-1 grid-rows-1";
  if (count === 2) return "grid-cols-2 grid-rows-1";
  if (count <= 4) return "grid-cols-2 grid-rows-2";
  if (count <= 6) return "grid-cols-3 grid-rows-2";
  return "grid-cols-3 grid-rows-3";
}

function ParticipantTile({
  participant,
  isLocal,
  localStream,
}: {
  participant: GroupCallParticipant;
  isLocal?: boolean;
  localStream?: MediaStream | null;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const stream = isLocal ? localStream : participant.stream;
  const hasVideo = stream && stream.getVideoTracks().some((t) => t.enabled);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (stream && hasVideo) {
      el.srcObject = stream;
      el.play().catch(() => {});
    } else {
      el.srcObject = null;
    }
    return () => {
      el.srcObject = null;
    };
  }, [stream, hasVideo]);

  return (
    <div
      className="relative rounded-2xl overflow-hidden flex items-center justify-center"
      style={{ background: "hsl(0 0% 14%)", minHeight: 120 }}
    >
      {hasVideo ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          className="w-full h-full object-cover"
          style={isLocal ? { transform: "scaleX(-1)" } : undefined}
        />
      ) : (
        <div className="flex flex-col items-center gap-2">
          <IdentityAvatar name={participant.name} size="lg" />
        </div>
      )}

      <div
        className="absolute bottom-2 left-2 right-2 flex items-center justify-between"
      >
        <div
          className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[0.6875rem] font-medium"
          style={{ background: "hsl(0 0% 0% / 0.6)", color: "white" }}
        >
          {participant.isMuted && <MicOff className="h-3 w-3" style={{ color: "hsl(0 70% 60%)" }} />}
          {participant.isSpeaking && !participant.isMuted && (
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: "hsl(142 70% 50%)" }} />
          )}
          <span>{isLocal ? "You" : participant.name}</span>
        </div>

        {participant.qualityLabel && (
          <div
            className="px-1.5 py-0.5 rounded text-[0.5625rem] font-medium"
            style={{
              background: "hsl(0 0% 0% / 0.5)",
              color:
                participant.qualityLabel === "excellent" || participant.qualityLabel === "good"
                  ? "hsl(142 70% 60%)"
                  : participant.qualityLabel === "fair"
                    ? "hsl(40 80% 60%)"
                    : "hsl(0 70% 60%)",
            }}
          >
            {participant.qualityLabel}
          </div>
        )}
      </div>
    </div>
  );
}

export function GroupCallScreen() {
  const { t } = useI18n();
  const room = useGroupCallStore((s) => s.room);
  const localStream = useGroupCallStore((s) => s.localStream);
  const isMuted = useGroupCallStore((s) => s.isMuted);
  const isCameraOn = useGroupCallStore((s) => s.isCameraOn);
  const isScreenSharing = useGroupCallStore((s) => s.isScreenSharing);
  const toggleMute = useGroupCallStore((s) => s.toggleMute);
  const toggleCamera = useGroupCallStore((s) => s.toggleCamera);
  const reset = useGroupCallStore((s) => s.reset);

  const [isEnding, setIsEnding] = useState(false);

  const handleLeave = useCallback(() => {
    if (isEnding) return;
    setIsEnding(true);
    window.dispatchEvent(new CustomEvent("orbit:group-call:leave"));
    setTimeout(() => setIsEnding(false), 1000);
  }, [isEnding]);

  if (!room || room.status === "idle" || room.status === "ended") return null;

  const isActive = room.status === "active";
  const participants = room.participants;
  const totalCount = participants.length + 1;

  const localParticipant: GroupCallParticipant = {
    userId: room.createdBy,
    orbitId: room.createdBy,
    name: "You",
    isMuted,
    isCameraOn,
    isScreenSharing,
    isSpeaking: false,
    stream: localStream,
    connectionState: "connected",
    joinedAt: room.startedAt,
  };

  return (
    <AnimatePresence>
      <motion.div
        key="group-call-screen"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-fullscreen flex flex-col"
        style={{ background: "#111111" }}
      >
        <div
          className="relative z-20 flex items-center justify-between px-5 shrink-0"
          style={{ paddingTop: "max(env(safe-area-inset-top, 16px), 16px)" }}
        >
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4" style={{ color: "hsl(0 0% 70%)" }} />
            <span className="text-sm font-medium" style={{ color: "hsl(0 0% 70%)" }}>
              {totalCount}/{room.maxParticipants}
            </span>
          </div>

          <div className="flex-1 text-center">
            <h1 className="text-lg font-bold" style={{ color: "white" }}>
              {room.roomName}
            </h1>
            <span
              className="text-sm font-mono tabular-nums"
              style={{ color: "hsl(0 0% 70%)" }}
            >
              {isActive ? formatElapsed(room.elapsed) : room.status}
            </span>
          </div>

          {room.isRecording && (
            <div className="flex items-center gap-1">
              <Circle className="h-3 w-3" style={{ color: "hsl(0 72% 55%)", fill: "hsl(0 72% 55%)" }} />
              <span className="text-[0.625rem] font-medium" style={{ color: "hsl(0 72% 55%)" }}>REC</span>
            </div>
          )}
        </div>

        <div className={`flex-1 p-3 grid gap-2 ${getGridClass(totalCount)}`}>
          <ParticipantTile
            participant={localParticipant}
            isLocal
            localStream={localStream}
          />
          {participants.map((p) => (
            <ParticipantTile key={p.userId} participant={p} />
          ))}
        </div>

        <div
          className="relative z-20 shrink-0 px-6"
          style={{ paddingBottom: "max(env(safe-area-inset-bottom, 28px), 28px)" }}
        >
          <div
            className="flex items-center justify-center gap-1 px-3 py-2.5 mx-auto rounded-full"
            style={{
              background: "hsl(0 0% 10% / 0.85)",
              backdropFilter: "blur(16px)",
              maxWidth: "380px",
            }}
          >
            <ControlBtn
              onClick={toggleCamera}
              icon={isCameraOn ? <VideoIcon className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
              style={{
                color: isCameraOn ? "hsl(0 0% 10%)" : "white",
                background: isCameraOn ? "white" : "hsl(0 0% 22%)",
              }}
            />

            <ControlBtn
              onClick={toggleMute}
              icon={isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              style={{
                color: "white",
                background: isMuted ? "hsl(0 60% 50%)" : "hsl(0 0% 28%)",
              }}
            />

            <ControlBtn
              onClick={() => window.dispatchEvent(new CustomEvent("orbit:group-call:screen-share"))}
              icon={<MonitorUp className="h-5 w-5" />}
              style={{
                color: isScreenSharing ? "hsl(0 0% 10%)" : "white",
                background: isScreenSharing ? "hsl(142 60% 50%)" : "hsl(0 0% 28%)",
              }}
            />

            <button
              onClick={handleLeave}
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
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

function ControlBtn({
  onClick,
  icon,
  style,
}: {
  onClick: () => void;
  icon: React.ReactNode;
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

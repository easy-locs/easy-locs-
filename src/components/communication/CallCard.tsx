/**
 * CallCard — WhatsApp-style inline call event card for chat threads.
 * Reads from CanonicalMetadata.call + .timing — no body parsing.
 */
import { memo } from "react";
import { Phone, PhoneIncoming, PhoneMissed, PhoneOff, Video, PhoneOutgoing } from "lucide-react";
import { format } from "date-fns";
import type { CanonicalMessageEnvelope } from "@/families/messages/canonical-envelope";

export interface CallCardProps {
  envelope: CanonicalMessageEnvelope;
  isMe: boolean;
  onCallback?: () => void;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

const CALL_CONFIG: Record<string, {
  label: string;
  iconColor: string;
  bgToken: string;
  borderToken: string;
}> = {
  call_audio: {
    label: "Audio call",
    iconColor: "hsl(var(--hud-success))",
    bgToken: "hsl(var(--hud-success) / 0.06)",
    borderToken: "hsl(var(--hud-success) / 0.12)",
  },
  call_video: {
    label: "Video call",
    iconColor: "hsl(var(--hud-success))",
    bgToken: "hsl(var(--hud-success) / 0.06)",
    borderToken: "hsl(var(--hud-success) / 0.12)",
  },
  call_missed: {
    label: "Missed call",
    iconColor: "hsl(var(--destructive))",
    bgToken: "hsl(var(--destructive) / 0.06)",
    borderToken: "hsl(var(--destructive) / 0.12)",
  },
  call_declined: {
    label: "Declined call",
    iconColor: "hsl(var(--hud-warning))",
    bgToken: "hsl(var(--hud-warning) / 0.06)",
    borderToken: "hsl(var(--hud-warning) / 0.12)",
  },
};

function CallCard({ envelope, isMe, onCallback }: CallCardProps) {
  const { type, metadata, createdAt } = envelope;
  const callMeta = metadata.call;
  const timing = metadata.timing;
  const config = CALL_CONFIG[type] || CALL_CONFIG.call_audio;

  const isMissed = type === "call_missed";
  const isDeclined = type === "call_declined";
  const isVideo = callMeta?.mode === "video" || type === "call_video";
  const direction = callMeta?.direction || (isMe ? "outgoing" : "incoming");

  const DirectionIcon = direction === "outgoing" ? PhoneOutgoing : PhoneIncoming;
  const StatusIcon = isMissed ? PhoneMissed : isDeclined ? PhoneOff : DirectionIcon;
  const MediaIcon = isVideo ? Video : Phone;

  const durationSeconds = timing?.durationSeconds;
  const showCallback = isMissed && callMeta?.callbackEnabled !== false;

  return (
    <div className="flex justify-center my-2">
      <button
        onClick={showCallback ? onCallback : undefined}
        disabled={!showCallback}
        className="group inline-flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-150 hover:scale-[1.01] active:scale-[0.99] disabled:cursor-default"
        style={{
          background: config.bgToken,
          border: `1px solid ${config.borderToken}`,
          boxShadow: "0 1px 4px hsl(var(--foreground) / 0.03)",
        }}
      >
        {/* Status icon */}
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
          style={{
            background: config.bgToken,
            border: `1px solid ${config.borderToken}`,
          }}
        >
          <StatusIcon className="h-4 w-4" style={{ color: config.iconColor }} />
        </div>

        {/* Info */}
        <div className="flex flex-col items-start min-w-0">
          <span className="text-xs font-semibold leading-tight" style={{ color: "hsl(var(--foreground))" }}>
            {config.label}
          </span>
          <div className="flex items-center gap-1.5 mt-0.5">
            <MediaIcon className="h-3 w-3" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }} />
            {!isMissed && !isDeclined && durationSeconds != null && durationSeconds > 0 && (
              <span className="text-2xs font-medium" style={{ color: "hsl(var(--hud-text-dim) / 0.6)" }}>
                {formatDuration(durationSeconds)}
              </span>
            )}
            {isMissed && showCallback && (
              <span className="text-2xs" style={{ color: config.iconColor }}>
                Tap to call back
              </span>
            )}
          </div>
        </div>

        {/* Time */}
        <span
          className="text-2xs font-mono tabular-nums ml-2 shrink-0"
          style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}
        >
          {timing?.localTime || format(new Date(createdAt), "HH:mm")}
        </span>
      </button>
    </div>
  );
}

export default memo(CallCard);

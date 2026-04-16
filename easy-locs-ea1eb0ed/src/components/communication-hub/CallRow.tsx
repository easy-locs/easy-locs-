import { memo, useRef } from "react";
import { Phone, Video } from "lucide-react";
import { toast } from "sonner";
import { deleteCallLog } from "@/repositories/communication.repository";
import SwipeableCallItem from "./SwipeableCallItem";

export interface CallLog {
  id: string;
  conversation_id: string;
  session_id: string | null;
  caller_orbit_id: string;
  receiver_orbit_id: string;
  call_type: string;
  direction: string;
  status: string;
  started_at: string | null;
  answered_at: string | null;
  ended_at: string | null;
  duration_sec: number;
  created_at: string;
}

interface CallRowProps {
  call: CallLog;
  primaryLabel: string;
  secondaryLabel: string | null;
  friendlyId: string;
  callIcon: React.ReactNode;
  isInCall: boolean;
  isStartingCall: boolean;
  redialLabel: string;
  deleteFailLabel: string;
  deletedLabel: string;
  contactFallback: string;
  onRedial: (c: CallLog) => void;
  onOpenDetail: (c: CallLog) => void;
  onOpenThread?: (peerId: string, peerName: string) => void;
  onDelete: (id: string) => void;
  nameCache: Record<string, string>;
}

function formatCallTime(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return d.toLocaleDateString([], { weekday: "short" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

export const CallRow = memo(function CallRow({
  call, primaryLabel, secondaryLabel, friendlyId, callIcon, isInCall, isStartingCall,
  redialLabel, deleteFailLabel, deletedLabel, contactFallback,
  onRedial, onOpenDetail, onOpenThread, onDelete, nameCache,
}: CallRowProps) {
  const longPressRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pressedRef = useRef(false);

  const handlePointerDown = () => {
    pressedRef.current = false;
    longPressRef.current = setTimeout(() => {
      pressedRef.current = true;
      onOpenDetail(call);
    }, 500);
  };

  const handlePointerUp = () => {
    if (longPressRef.current) clearTimeout(longPressRef.current);
  };

  const handleClick = () => {
    if (pressedRef.current) return;
    const peerId = call.direction === "outgoing" ? call.receiver_orbit_id : call.caller_orbit_id;
    const peerName = nameCache[peerId] || contactFallback;
    if (onOpenThread) {
      onOpenThread(peerId, peerName);
    } else {
      void onRedial(call);
    }
  };

  const handleDeleteCall = async () => {
    try {
      await deleteCallLog(call.id);
    } catch {
      toast.error(deleteFailLabel);
      return;
    }
    onDelete(call.id);
    toast.success(deletedLabel);
  };

  return (
    <SwipeableCallItem onDelete={handleDeleteCall}>
      <button
        type="button"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onClick={handleClick}
        disabled={isInCall || isStartingCall}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 transition-colors text-left disabled:opacity-60"
        style={{ background: "hsl(var(--background))" }}
        onMouseEnter={e => (e.currentTarget.style.background = "hsl(var(--card) / 0.3)")}
        onMouseLeave={e => (e.currentTarget.style.background = "hsl(var(--background))")}
      >
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
          style={{
            background: call.status === "missed"
              ? "hsl(var(--hud-danger) / 0.08)"
              : "hsl(var(--card))",
          }}
        >
          {callIcon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-1 min-w-0">
            <span
              className="text-[0.84375rem] font-semibold line-clamp-1 break-words"
              style={{ color: call.status === "missed" ? "hsl(var(--hud-danger))" : "hsl(var(--foreground))" }}
            >
              {primaryLabel}
            </span>
            {primaryLabel !== friendlyId && (
              <span className="text-[0.59375rem] font-medium truncate max-w-[72px]" style={{ color: "hsl(var(--muted-foreground) / 0.35)" }}>
                {friendlyId}
              </span>
            )}
          </div>
          {secondaryLabel && (
            <span className="text-[0.6875rem] mt-0.5 block" style={{ color: "hsl(var(--muted-foreground) / 0.45)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100%" }}>
              {secondaryLabel}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0 pl-1">
          <span className="text-[0.65625rem] tabular-nums whitespace-nowrap" style={{ color: "hsl(var(--muted-foreground) / 0.35)" }}>
            {formatCallTime(call.created_at)}
          </span>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); void onRedial(call); }}
            disabled={isInCall || isStartingCall}
            className="h-7 w-7 rounded-full flex items-center justify-center shrink-0 transition-colors"
            title={redialLabel}
          >
            {call.call_type === "video" ? (
              <Video className="h-[14px] w-[14px]" style={{ color: "hsl(var(--primary))" }} />
            ) : (
              <Phone className="h-[14px] w-[14px]" style={{ color: "hsl(var(--hud-success))" }} />
            )}
          </button>
        </div>
      </button>
    </SwipeableCallItem>
  );
});

/**
 * MessageStatusBadge — SINGLE unified delivery status indicator for ALL bubble families.
 * WhatsApp-grade: ⏳ → ✓ → ✓✓ → ✓✓ blue → ⚠ failed → 🔄 retrying
 *
 * RULE: No bubble implements its own tick logic. All use this badge.
 */
import { memo } from "react";
import { Check, CheckCheck, Clock, AlertCircle, RefreshCw } from "lucide-react";
import type { MessageStatus } from "@/domains/orbit/types";

interface Props {
  status: MessageStatus;
  isMe: boolean;
  /** Upload progress 0-100 (media only) */
  progress?: number;
}

function Badge({ status, isMe, progress }: Props) {
  if (!isMe) return null;

  return (
    <span className="inline-flex items-center justify-center w-3.5 h-3.5">
      {status === "sending" && (
        <Clock className="h-2.5 w-2.5 animate-pulse" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }} />
      )}
      {status === "sent" && (
        <Check className="h-3 w-3 animate-[fade-in_120ms_ease-out]" style={{ color: "hsl(var(--hud-text-dim) / 0.35)" }} />
      )}
      {status === "delivered" && (
        <CheckCheck className="h-3 w-3 animate-[fade-in_120ms_ease-out]" style={{ color: "hsl(var(--hud-text-dim) / 0.35)" }} />
      )}
      {status === "read" && (
        <CheckCheck className="h-3 w-3 animate-[fade-in_120ms_ease-out]" style={{ color: "hsl(var(--hud-cyan))" }} />
      )}
      {status === "failed" && (
        <AlertCircle className="h-2.5 w-2.5" style={{ color: "hsl(var(--hud-danger) / 0.8)" }} />
      )}
      {status === "retrying" && (
        <RefreshCw className="h-2.5 w-2.5 animate-spin" style={{ color: "hsl(var(--hud-warning) / 0.7)" }} />
      )}
    </span>
  );
}

export const MessageStatusBadge = memo(Badge);
MessageStatusBadge.displayName = "MessageStatusBadge";

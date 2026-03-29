/**
 * BubbleMetaFooter — Isolated message footer (time + status + security).
 * Memoized: only rerenders when read/edit/security status changes.
 */
import { memo } from "react";
import { Check, CheckCheck, WifiOff } from "lucide-react";
import { format } from "date-fns";

interface Props {
  createdAt: string;
  isMe: boolean;
  read?: boolean;
  editedAt?: string | null;
  isPendingOffline?: boolean;
  securityEmoji?: string;
  securityLabel?: string;
}

function BubbleMetaFooterInner({ createdAt, isMe, read, editedAt, isPendingOffline, securityEmoji, securityLabel }: Props) {
  return (
    <div className="flex items-center justify-end gap-1 mt-0.5 -mb-0.5 select-none">
      {editedAt && <span className="text-[9px] italic opacity-30 mr-0.5">edited</span>}
      {securityEmoji && <span className="text-[9px] mr-0.5" title={securityLabel}>{securityEmoji}</span>}
      <span className="text-[10px] opacity-35 font-medium tabular-nums">
        {format(new Date(createdAt), "HH:mm")}
      </span>
      {isMe && isPendingOffline ? (
        <WifiOff className="h-2.5 w-2.5" style={{ color: "hsl(var(--hud-danger) / 0.6)" }} />
      ) : isMe && (
        <span style={{ color: read ? "hsl(var(--hud-cyan))" : "hsl(var(--hud-text-dim) / 0.35)" }}>
          {read ? <CheckCheck className="h-3 w-3" /> : <Check className="h-3 w-3" />}
        </span>
      )}
    </div>
  );
}

export const BubbleMetaFooter = memo(BubbleMetaFooterInner);
BubbleMetaFooter.displayName = "BubbleMetaFooter";

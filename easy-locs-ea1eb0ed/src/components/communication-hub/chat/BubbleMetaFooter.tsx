/**
 * BubbleMetaFooter — WhatsApp-grade message footer.
 * Shows: time + edit badge + security + delivery status via unified MessageStatusBadge.
 * Memoized: only rerenders when status/time changes.
 */
import { memo } from "react";
import { WifiOff } from "lucide-react";
import { format } from "date-fns";
import { MessageStatusBadge } from "@/components/orbit/MessageStatusBadge";
import type { MessageStatus } from "@/domains/orbit/types";

interface Props {
  createdAt: string;
  isMe: boolean;
  read?: boolean;
  /** Canonical delivery status from status machine */
  deliveryStatus?: MessageStatus;
  editedAt?: string | null;
  isPendingOffline?: boolean;
  /** Upload progress 0-100 (shown during media send) */
  progress?: number;
  securityEmoji?: string;
  securityLabel?: string;
}

function resolveStatus(props: Props): MessageStatus {
  if (props.deliveryStatus) return props.deliveryStatus;
  if (props.isPendingOffline) return "sending";
  if (props.read) return "read";
  return "sent";
}

function BubbleMetaFooterInner(props: Props) {
  const { createdAt, isMe, editedAt, isPendingOffline, progress, securityEmoji, securityLabel } = props;
  const status = resolveStatus(props);

  return (
    <div className="flex items-center justify-end gap-1 mt-0.5 -mb-0.5 select-none">
      {editedAt && <span className="text-[10px] italic mr-0.5" style={{ color: "hsl(var(--muted-foreground) / 0.35)" }}>edited</span>}
      {securityEmoji && <span className="text-[10px] mr-0.5" title={securityLabel}>{securityEmoji}</span>}
      {isMe && typeof progress === "number" && progress > 0 && progress < 100 && (
        <span className="text-[10px] tabular-nums" style={{ color: "hsl(var(--muted-foreground) / 0.5)" }}>{progress}%</span>
      )}
      <span className="text-[10px] font-medium tabular-nums" style={{ color: "hsl(var(--muted-foreground) / 0.4)" }}>
        {format(new Date(createdAt), "HH:mm")}
      </span>
      {isMe && isPendingOffline ? (
        <WifiOff className="h-2.5 w-2.5" style={{ color: "hsl(var(--hud-danger) / 0.6)" }} />
      ) : isMe && (
        <MessageStatusBadge status={status} isMe={isMe} progress={progress} />
      )}
    </div>
  );
}

export const BubbleMetaFooter = memo(BubbleMetaFooterInner);
BubbleMetaFooter.displayName = "BubbleMetaFooter";

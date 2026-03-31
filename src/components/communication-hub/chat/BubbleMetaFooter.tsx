/**
 * BubbleMetaFooter — WhatsApp-grade message footer.
 * Shows: time + edit badge + security + delivery status (⏳ → ✓ → ✓✓ → ✓✓ blue)
 * Memoized: only rerenders when status/time changes.
 */
import { memo } from "react";
import { Check, CheckCheck, WifiOff, Clock, AlertCircle } from "lucide-react";
import { format } from "date-fns";

type DeliveryStatus = "sending" | "sent" | "delivered" | "read" | "failed";

interface Props {
  createdAt: string;
  isMe: boolean;
  read?: boolean;
  /** WhatsApp-style delivery status (overrides `read` if provided) */
  deliveryStatus?: DeliveryStatus;
  editedAt?: string | null;
  isPendingOffline?: boolean;
  /** Upload progress 0-100 (shown during media send) */
  progress?: number;
  securityEmoji?: string;
  securityLabel?: string;
}

function resolveStatus(props: Props): DeliveryStatus {
  if (props.deliveryStatus) return props.deliveryStatus;
  if (props.isPendingOffline) return "sending";
  if (props.read) return "read";
  return "sent";
}

function DeliveryTick({ status }: { status: DeliveryStatus }) {
  switch (status) {
    case "sending":
      return <Clock className="h-2.5 w-2.5 animate-pulse" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }} />;
    case "sent":
      return <Check className="h-3 w-3" style={{ color: "hsl(var(--hud-text-dim) / 0.35)" }} />;
    case "delivered":
      return <CheckCheck className="h-3 w-3" style={{ color: "hsl(var(--hud-text-dim) / 0.35)" }} />;
    case "read":
      return <CheckCheck className="h-3 w-3" style={{ color: "hsl(var(--hud-cyan))" }} />;
    case "failed":
      return <AlertCircle className="h-2.5 w-2.5" style={{ color: "hsl(var(--hud-danger) / 0.8)" }} />;
    default:
      return null;
  }
}

function BubbleMetaFooterInner(props: Props) {
  const { createdAt, isMe, editedAt, isPendingOffline, progress, securityEmoji, securityLabel } = props;
  const status = resolveStatus(props);

  return (
    <div className="flex items-center justify-end gap-1 mt-0.5 -mb-0.5 select-none">
      {editedAt && <span className="text-[9px] italic opacity-30 mr-0.5">edited</span>}
      {securityEmoji && <span className="text-[9px] mr-0.5" title={securityLabel}>{securityEmoji}</span>}
      {isMe && typeof progress === "number" && progress > 0 && progress < 100 && (
        <span className="text-[9px] tabular-nums opacity-40">{progress}%</span>
      )}
      <span className="text-[10px] opacity-35 font-medium tabular-nums">
        {format(new Date(createdAt), "HH:mm")}
      </span>
      {isMe && isPendingOffline ? (
        <WifiOff className="h-2.5 w-2.5" style={{ color: "hsl(var(--hud-danger) / 0.6)" }} />
      ) : isMe && (
        <DeliveryTick status={status} />
      )}
    </div>
  );
}

export const BubbleMetaFooter = memo(BubbleMetaFooterInner);
BubbleMetaFooter.displayName = "BubbleMetaFooter";

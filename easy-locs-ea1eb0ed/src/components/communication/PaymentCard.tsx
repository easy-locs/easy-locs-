/**
 * PaymentCard — Inline payment request/receipt card.
 * Shows real-time status with visual indicators.
 */
import { memo } from "react";
import { DollarSign, ArrowUpRight, ArrowDownLeft, CheckCircle2, XCircle, Clock, RefreshCw } from "lucide-react";
import type { CanonicalMessageEnvelope } from "@/families/messages/canonical-envelope";

interface Props {
  envelope: CanonicalMessageEnvelope;
  isMe: boolean;
}

function PaymentCard({ envelope, isMe }: Props) {
  const payment = envelope.metadata.payment;
  const isRequest = envelope.type === "payment_request";
  const amount = payment?.amount ?? 0;
  const currency = payment?.currency ?? "AED";
  const status = payment?.status ?? "pending";

  const statusConfig: Record<string, { color: string; bg: string; icon: typeof CheckCircle2; label: string }> = {
    completed: { color: "hsl(var(--primary))", bg: "hsl(var(--primary) / 0.08)", icon: CheckCircle2, label: "Completed" },
    pending: { color: "hsl(var(--warning, 45 93% 47%))", bg: "hsl(var(--warning, 45 93% 47%) / 0.08)", icon: Clock, label: "Pending" },
    initiated: { color: "hsl(var(--warning, 45 93% 47%))", bg: "hsl(var(--warning, 45 93% 47%) / 0.08)", icon: Clock, label: "Processing" },
    failed: { color: "hsl(var(--destructive))", bg: "hsl(var(--destructive) / 0.08)", icon: XCircle, label: "Failed" },
    cancelled: { color: "hsl(var(--muted-foreground))", bg: "hsl(var(--muted-foreground) / 0.06)", icon: XCircle, label: "Cancelled" },
    refunded: { color: "hsl(var(--muted-foreground))", bg: "hsl(var(--muted-foreground) / 0.06)", icon: RefreshCw, label: "Refunded" },
  };

  const config = statusConfig[status] || statusConfig.pending;
  const StatusIcon = config.icon;
  const DirectionIcon = isRequest ? ArrowUpRight : ArrowDownLeft;

  return (
    <div className={`flex ${isMe ? "justify-end" : "justify-start"} px-2 py-0.5`}>
      <div
        className="max-w-[260px] rounded-2xl overflow-hidden"
        style={{
          background: isMe
            ? "linear-gradient(135deg, hsl(var(--primary) / 0.1), hsl(var(--primary) / 0.05))"
            : "hsl(var(--muted) / 0.5)",
          border: "1px solid hsl(var(--border) / 0.1)",
        }}
      >
        <div className="px-4 py-3 space-y-2">
          <div className="flex items-center gap-2.5">
            <div
              className="h-9 w-9 rounded-full flex items-center justify-center shrink-0"
              style={{ background: config.bg }}
            >
              <DirectionIcon className="h-4 w-4" style={{ color: config.color }} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium" style={{ color: "hsl(var(--muted-foreground))" }}>
                {isRequest ? "Payment request" : "Payment received"}
              </p>
              <p className="text-base font-bold tabular-nums" style={{ color: "hsl(var(--foreground))" }}>
                {amount.toLocaleString()} {currency}
              </p>
            </div>
          </div>

          {payment?.recipientName && (
            <p className="text-[11px] truncate" style={{ color: "hsl(var(--muted-foreground) / 0.7)" }}>
              {isRequest ? "From" : "To"}: {payment.recipientName}
            </p>
          )}

          <div
            className="flex items-center gap-1.5 px-2 py-1 rounded-lg w-fit"
            style={{ background: config.bg }}
          >
            <StatusIcon className="h-3 w-3" style={{ color: config.color }} />
            <span className="text-[10px] font-semibold" style={{ color: config.color }}>
              {config.label}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default memo(PaymentCard);

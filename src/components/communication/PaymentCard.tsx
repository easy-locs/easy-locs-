/**
 * PaymentCard — Inline payment request/receipt card.
 */
import { memo } from "react";
import { DollarSign, ArrowUpRight, ArrowDownLeft, CheckCircle2, XCircle } from "lucide-react";
import type { CanonicalMessageEnvelope } from "@/families/messages/canonical-envelope";

interface Props {
  envelope: CanonicalMessageEnvelope;
  isMe: boolean;
}

function PaymentCard({ envelope, isMe }: Props) {
  const payment = envelope.metadata.payment;
  const isRequest = envelope.type === "payment_request";
  const amount = payment?.amount ?? 0;
  const currency = payment?.currency ?? "USD";
  const status = payment?.status ?? "pending";

  const statusConfig: Record<string, { color: string; icon: typeof CheckCircle2; label: string }> = {
    completed: { color: "hsl(var(--primary))", icon: CheckCircle2, label: "Completed" },
    pending: { color: "hsl(var(--warning, 45 93% 47%))", icon: DollarSign, label: "Pending" },
    failed: { color: "hsl(var(--destructive))", icon: XCircle, label: "Failed" },
    cancelled: { color: "hsl(var(--muted-foreground))", icon: XCircle, label: "Cancelled" },
  };

  const config = statusConfig[status] || statusConfig.pending;
  const StatusIcon = config.icon;
  const DirectionIcon = isRequest ? ArrowUpRight : ArrowDownLeft;

  return (
    <div className={`flex ${isMe ? "justify-end" : "justify-start"} px-2 py-0.5`}>
      <div
        className="max-w-[260px] rounded-2xl px-4 py-3 space-y-2"
        style={{
          background: isMe
            ? "linear-gradient(135deg, hsl(var(--primary) / 0.1), hsl(var(--primary) / 0.05))"
            : "hsl(var(--muted) / 0.5)",
          border: "1px solid hsl(var(--border) / 0.1)",
        }}
      >
        <div className="flex items-center gap-2">
          <div
            className="h-8 w-8 rounded-full flex items-center justify-center"
            style={{ background: `${config.color}20` }}
          >
            <DirectionIcon className="h-4 w-4" style={{ color: config.color }} />
          </div>
          <div>
            <p className="text-[11px] font-medium" style={{ color: "hsl(var(--muted-foreground))" }}>
              {isRequest ? "Payment request" : "Payment received"}
            </p>
            <p className="text-base font-bold tabular-nums" style={{ color: "hsl(var(--foreground))" }}>
              {amount.toLocaleString()} {currency}
            </p>
          </div>
        </div>

        {payment?.recipientName && (
          <p className="text-[11px]" style={{ color: "hsl(var(--muted-foreground) / 0.7)" }}>
            {isRequest ? "From" : "To"}: {payment.recipientName}
          </p>
        )}

        <div className="flex items-center gap-1 pt-0.5">
          <StatusIcon className="h-3 w-3" style={{ color: config.color }} />
          <span className="text-[10px] font-medium" style={{ color: config.color }}>
            {config.label}
          </span>
        </div>
      </div>
    </div>
  );
}

export default memo(PaymentCard);

import { memo } from "react";
import { ArrowRight, Wallet, CheckCircle2, Clock, XCircle } from "lucide-react";
import type { CanonicalMessageEnvelope } from "@/families/messages/canonical-envelope";

interface Props {
  envelope: CanonicalMessageEnvelope;
  isMe: boolean;
}

function TransferCard({ envelope, isMe }: Props) {
  const payment = envelope.metadata.payment;
  const amount = payment?.amount ?? 0;
  const currency = payment?.currency ?? "AED";
  const status = payment?.status ?? "pending";
  const recipientName = payment?.recipientName;

  const statusConfig: Record<string, { color: string; icon: typeof CheckCircle2; label: string }> = {
    completed: { color: "hsl(var(--primary))", icon: CheckCircle2, label: "Sent" },
    pending: { color: "hsl(var(--warning, 45 93% 47%))", icon: Clock, label: "Processing" },
    failed: { color: "hsl(var(--destructive))", icon: XCircle, label: "Failed" },
    cancelled: { color: "hsl(var(--muted-foreground))", icon: XCircle, label: "Cancelled" },
  };

  const config = statusConfig[status] || statusConfig.pending;
  const StatusIcon = config.icon;

  return (
    <div className={`flex ${isMe ? "justify-end" : "justify-start"} px-2 py-0.5`}>
      <div
        className="max-w-[260px] rounded-2xl overflow-hidden"
        style={{
          background: isMe
            ? "linear-gradient(135deg, hsl(var(--primary) / 0.1), hsl(var(--primary) / 0.04))"
            : "hsl(var(--muted) / 0.5)",
          border: "1px solid hsl(var(--border) / 0.1)",
        }}
      >
        <div
          className="px-4 py-2.5 flex items-center gap-2"
          style={{
            background: isMe ? "hsl(var(--primary) / 0.06)" : "hsl(var(--muted) / 0.3)",
            borderBottom: "1px solid hsl(var(--border) / 0.06)",
          }}
        >
          <Wallet className="h-3.5 w-3.5 shrink-0" style={{ color: "hsl(var(--primary))" }} />
          <span className="text-[11px] font-semibold" style={{ color: "hsl(var(--foreground) / 0.8)" }}>
            Wallet Transfer
          </span>
        </div>

        <div className="px-4 py-3 space-y-2">
          <div className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-lg font-bold tabular-nums" style={{ color: "hsl(var(--foreground))" }}>
                {amount.toLocaleString()} {currency}
              </p>
              {recipientName && (
                <div className="flex items-center gap-1 mt-0.5">
                  <ArrowRight className="h-3 w-3 shrink-0" style={{ color: "hsl(var(--muted-foreground) / 0.5)" }} />
                  <span className="text-[11px] truncate" style={{ color: "hsl(var(--muted-foreground) / 0.7)" }}>
                    {recipientName}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 pt-0.5">
            <StatusIcon className="h-3 w-3" style={{ color: config.color }} />
            <span className="text-[10px] font-medium" style={{ color: config.color }}>
              {config.label}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default memo(TransferCard);

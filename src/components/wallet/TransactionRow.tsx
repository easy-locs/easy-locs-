/**
 * TransactionRow — Clean transaction display for wallet history.
 */
import { ArrowUpRight, ArrowDownLeft, RefreshCw, Lock, Unlock, Plus, Send } from "lucide-react";

export type TransactionType = "payment" | "refund" | "adjustment" | "escrow_hold" | "escrow_release" | "top_up" | "transfer";

interface TransactionRowProps {
  title: string;
  amount: number;
  currency: string;
  type: TransactionType;
  direction: "in" | "out";
  status: "completed" | "pending" | "failed";
  timestamp: string;
  referenceCode?: string | null;
}

const TYPE_CONFIG: Record<TransactionType, { icon: any; color: string }> = {
  payment:        { icon: ArrowUpRight, color: "hsl(0 70% 55%)" },
  refund:         { icon: ArrowDownLeft, color: "hsl(142 70% 45%)" },
  adjustment:     { icon: RefreshCw, color: "hsl(200 70% 55%)" },
  escrow_hold:    { icon: Lock, color: "hsl(45 90% 55%)" },
  escrow_release: { icon: Unlock, color: "hsl(142 70% 45%)" },
  top_up:         { icon: Plus, color: "hsl(142 70% 45%)" },
  transfer:       { icon: Send, color: "hsl(270 70% 60%)" },
};

export default function TransactionRow({ title, amount, currency, type, direction, status, timestamp, referenceCode }: TransactionRowProps) {
  const config = TYPE_CONFIG[type] || TYPE_CONFIG.payment;
  const Icon = config.icon;
  const sign = direction === "in" ? "+" : "-";
  const amountColor = direction === "in" ? "hsl(142 70% 45%)" : "hsl(var(--foreground))";

  const time = new Date(timestamp);
  const timeStr = time.toLocaleDateString(undefined, { month: "short", day: "numeric" }) + " · " + time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="flex items-center gap-3 py-3 px-4">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${config.color}15` }}>
        <Icon className="w-4.5 h-4.5" style={{ color: config.color }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate">{title}</p>
        <div className="flex items-center gap-1.5">
          <p className="text-[10px] text-muted-foreground">{timeStr}</p>
          {referenceCode && (
            <span className="text-[9px] font-mono text-muted-foreground/60">#{referenceCode}</span>
          )}
        </div>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-sm font-bold" style={{ color: amountColor }}>{sign}{amount.toFixed(2)}</p>
        <p className="text-[10px] text-muted-foreground">{currency}</p>
      </div>
      {status === "pending" && (
        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "hsl(45 90% 55% / 0.12)", color: "hsl(45 90% 55%)" }}>pending</span>
      )}
      {status === "failed" && (
        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "hsl(0 70% 50% / 0.12)", color: "hsl(0 70% 50%)" }}>failed</span>
      )}
    </div>
  );
}

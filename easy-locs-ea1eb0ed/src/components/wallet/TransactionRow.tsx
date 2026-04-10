import { memo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowUpRight, ArrowDownLeft, RefreshCw, Lock, Unlock, Plus, Send, ChevronRight } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export type TransactionType = "payment" | "refund" | "adjustment" | "escrow_hold" | "escrow_release" | "top_up" | "transfer";

interface TransactionRowProps {
  id?: string;
  title: string;
  amount: number;
  currency: string;
  type: TransactionType;
  direction: "in" | "out";
  status: "completed" | "pending" | "failed";
  timestamp: string;
}

const TYPE_CONFIG: Record<TransactionType, { icon: any; color: string }> = {
  payment:        { icon: ArrowUpRight, color: "hsl(var(--primary))" },
  refund:         { icon: ArrowDownLeft, color: "hsl(152 60% 42%)" },
  adjustment:     { icon: RefreshCw, color: "hsl(210 80% 52%)" },
  escrow_hold:    { icon: Lock, color: "hsl(38 90% 50%)" },
  escrow_release: { icon: Unlock, color: "hsl(152 60% 42%)" },
  top_up:         { icon: Plus, color: "hsl(152 60% 42%)" },
  transfer:       { icon: Send, color: "hsl(270 60% 55%)" },
};

function formatAmount(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

export default memo(function TransactionRow({ id, title, amount, currency, type, direction, status, timestamp }: TransactionRowProps) {
  const navigate = useNavigate();
  const { t } = useI18n();
  const config = TYPE_CONFIG[type] || TYPE_CONFIG.payment;
  const Icon = config.icon;
  const sign = direction === "in" ? "+" : "-";
  const amountColor = direction === "in" ? "hsl(152 60% 42%)" : "hsl(var(--foreground))";

  const time = new Date(timestamp);
  const timeStr = time.toLocaleDateString(undefined, { month: "short", day: "numeric" }) + " · " + time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const handleClick = () => {
    if (id) navigate(`/wallet/transaction/${id}`);
  };

  return (
    <div className="app-list-row" onClick={handleClick}>
      <div className="app-list-row-icon" style={{ background: config.color.includes("var(--primary)") ? "hsl(var(--primary) / 0.06)" : config.color.replace(")", " / 0.08)") }}>
        <Icon style={{ color: config.color }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-foreground leading-snug truncate">{title}</p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <p className="text-[10px] text-muted-foreground">{timeStr}</p>
          {status === "pending" && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "hsl(38 90% 50% / 0.1)", color: "hsl(38 90% 50%)" }}>{t("wallet.txPending")}</span>
          )}
          {status === "failed" && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "hsl(0 70% 50% / 0.1)", color: "hsl(0 70% 50%)" }}>{t("wallet.txFailed")}</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <p className="text-sm font-bold tabular-nums" style={{ color: amountColor }}>
          {sign}{formatAmount(amount, currency)}
        </p>
        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/20" />
      </div>
    </div>
  );
});

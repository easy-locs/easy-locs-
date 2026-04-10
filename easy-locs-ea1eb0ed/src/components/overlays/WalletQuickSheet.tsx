import { memo, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Wallet, ArrowUpCircle, Send, QrCode, ArrowUpRight, Receipt, CreditCard, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { AppBottomSheet } from "@/components/ui/system/AppBottomSheet";
import { useI18n, tSafe } from "@/lib/i18n";
import { useWalletBalance, useWalletTransactions } from "@/payments/wallet-hooks";
import { haptic } from "@/lib/haptics";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGoFull: () => void;
}

const QUICK_ACTIONS = [
  { icon: ArrowUpCircle, labelKey: "wallet.top_up", fallback: "Top Up", route: "/wallet/top-up", color: "hsl(160 60% 45%)" },
  { icon: Send, labelKey: "wallet.transfer", fallback: "Transfer", route: "/wallet/transfer", color: "hsl(210 70% 55%)" },
  { icon: QrCode, labelKey: "wallet.scan", fallback: "Scan", route: "/pay/scan", color: "hsl(270 60% 55%)" },
  { icon: Receipt, labelKey: "wallet.request", fallback: "Request", route: "/wallet/request", color: "hsl(38 65% 56%)" },
];

function WalletQuickSheet({ open, onOpenChange, onGoFull }: Props) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { balance, currency, loading: balLoading } = useWalletBalance();
  const { items: txs, loading: txLoading } = useWalletTransactions(5);

  const recentTxs = useMemo(() => txs.slice(0, 4), [txs]);

  const handleAction = (route: string) => {
    haptic("medium");
    onOpenChange(false);
    setTimeout(() => navigate(route), 150);
  };

  return (
    <AppBottomSheet open={open} onOpenChange={onOpenChange} snapPoints={[0.5, 0.82]}>
      <div className="flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "hsl(220 40% 18%)" }}
            >
              <Wallet className="w-5 h-5" style={{ color: "hsl(38 65% 56%)" }} />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                {tSafe(t, "wallet.balance", "Balance")}
              </p>
              <p className="text-lg font-extrabold tabular-nums text-foreground leading-tight">
                {balLoading ? "..." : `${currency} ${Number(balance).toFixed(2)}`}
              </p>
            </div>
          </div>
          <button
            onClick={onGoFull}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg active:scale-95 transition-transform"
            style={{ background: "hsl(var(--muted) / 0.15)" }}
          >
            <span className="text-[10px] font-bold text-muted-foreground">
              {tSafe(t, "wallet.open_full", "Full Wallet")}
            </span>
            <ArrowUpRight className="w-3 h-3 text-muted-foreground" />
          </button>
        </div>

        <div className="grid grid-cols-4 gap-2 mb-4">
          {QUICK_ACTIONS.map((a) => (
            <button
              key={a.route}
              onClick={() => handleAction(a.route)}
              className="flex flex-col items-center gap-1.5 py-3 rounded-xl active:scale-95 transition-transform"
              style={{ background: "hsl(var(--muted) / 0.12)", border: "1px solid hsl(var(--border) / 0.06)" }}
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: `${a.color}15` }}
              >
                <a.icon className="w-4 h-4" style={{ color: a.color }} />
              </div>
              <span className="text-[10px] font-bold text-foreground/80">
                {tSafe(t, a.labelKey, a.fallback)}
              </span>
            </button>
          ))}
        </div>

        {recentTxs.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[11px] font-extrabold uppercase tracking-widest text-muted-foreground/60">
                {tSafe(t, "wallet.recent", "Recent")}
              </h3>
              <button
                onClick={() => handleAction("/wallet")}
                className="text-[10px] font-bold flex items-center gap-0.5"
                style={{ color: "hsl(38 65% 56%)" }}
              >
                {tSafe(t, "wallet.see_all", "See all")} <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            <div className="space-y-0.5">
              {recentTxs.map((tx, idx) => (
                <div
                  key={tx.id || idx}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                  style={{ background: "hsl(var(--muted) / 0.06)" }}
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: (tx as any).amount > 0 ? "hsl(160 60% 45% / 0.1)" : "hsl(0 0% 50% / 0.08)" }}
                  >
                    <CreditCard className="w-3.5 h-3.5" style={{ color: (tx as any).amount > 0 ? "hsl(160 60% 45%)" : "hsl(var(--muted-foreground))" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-foreground truncate">{(tx as any).counterpartyName || (tx as any).description || "Transaction"}</p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {(tx as any).contextType || (tx as any).type || ""}
                    </p>
                  </div>
                  <span className="text-xs font-extrabold tabular-nums shrink-0" style={{ color: (tx as any).amount > 0 ? "hsl(160 60% 45%)" : "hsl(var(--foreground))" }}>
                    {(tx as any).amount > 0 ? "+" : ""}{Number((tx as any).amount || 0).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={onGoFull}
          className="mt-4 w-full flex items-center justify-center gap-2 py-3 rounded-xl active:scale-[0.97] transition-transform"
          style={{
            background: "hsl(220 40% 18%)",
            border: "1px solid hsl(38 65% 56% / 0.2)",
          }}
        >
          <Wallet className="w-4 h-4" style={{ color: "hsl(38 65% 56%)" }} />
          <span className="text-xs font-bold text-white">
            {tSafe(t, "wallet.manage_full", "Manage Wallet")}
          </span>
        </button>
      </div>
    </AppBottomSheet>
  );
}

export default memo(WalletQuickSheet);

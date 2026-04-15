import { memo, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Wallet, ArrowUpCircle, Send, QrCode, ArrowUpRight, Receipt, CreditCard, ChevronRight, Store } from "lucide-react";
import { motion } from "framer-motion";
import { AppBottomSheet } from "@/components/ui/system/AppBottomSheet";
import { useI18n, tSafe } from "@/lib/i18n";
import { useWalletBalance, useWalletTransactions } from "@/payments/wallet-hooks";
import { haptic } from "@/lib/haptics";
import { setReturnOrigin } from "@/lib/navigation/return-origin";
import type { NavigationContext } from "@/lib/navigation/navigation-intent";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGoFull: () => void;
  entityContext?: NavigationContext | null;
}

const QUICK_ACTIONS = [
  { icon: ArrowUpCircle, labelKey: "wallet.top_up", fallback: "Top Up", route: "/wallet/top-up", color: "hsl(160 60% 45%)" },
  { icon: Send, labelKey: "wallet.transfer", fallback: "Transfer", route: "/wallet/transfer", color: "hsl(210 70% 55%)" },
  { icon: QrCode, labelKey: "wallet.scan", fallback: "Scan", route: "/pay/scan", color: "hsl(270 60% 55%)" },
  { icon: Receipt, labelKey: "wallet.request", fallback: "Request", route: "/wallet/request", color: "hsl(var(--accent))" },
];

function WalletQuickSheet({ open, onOpenChange, onGoFull, entityContext }: Props) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { balance, currency, loading: balLoading } = useWalletBalance();
  const { items: txs, loading: txLoading } = useWalletTransactions(5);

  const recentTxs = useMemo(() => txs.slice(0, 4), [txs]);

  const handleAction = (route: string) => {
    haptic("medium");
    onOpenChange(false);
    setReturnOrigin(window.location.pathname);
    setTimeout(() => navigate(route), 150);
  };

  const handlePayEntity = () => {
    haptic("medium");
    onOpenChange(false);
    setReturnOrigin(window.location.pathname);
    const params = new URLSearchParams();
    const recipient = entityContext?.ownerUserId ?? entityContext?.entityId;
    if (recipient) params.set("to", recipient);
    if (entityContext?.entityName) params.set("name", entityContext.entityName);
    if (entityContext?.amount) params.set("amount", String(entityContext.amount));
    if (entityContext?.note) params.set("note", entityContext.note);
    setTimeout(() => navigate(`/wallet/transfer?${params.toString()}`), 150);
  };

  return (
    <AppBottomSheet open={open} onOpenChange={onOpenChange} snapPoints={[0.5, 0.82]}>
      <div className="flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "hsl(226 24% 14%)" }}
            >
              <Wallet className="w-5 h-5" style={{ color: "hsl(var(--accent))" }} />
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

        {entityContext?.entityName && (
          <button
            onClick={handlePayEntity}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-xl mb-4 active:scale-[0.98] transition-transform"
            style={{
              background: "hsl(160 60% 45% / 0.08)",
              border: "1px solid hsl(160 60% 45% / 0.15)",
            }}
          >
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: "hsl(160 60% 45% / 0.15)" }}
            >
              {entityContext.entityImage ? (
                <img loading="lazy" src={entityContext.entityImage} alt="" className="w-full h-full rounded-lg object-cover" />
              ) : (
                <Store className="w-4 h-4" style={{ color: "hsl(160 60% 45%)" }} />
              )}
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-xs font-bold text-foreground truncate leading-tight">
                {tSafe(t, "wallet.pay_to", "Pay")} {entityContext.entityName}
              </p>
              <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">
                {entityContext.amount
                  ? `${currency} ${Number(entityContext.amount).toFixed(2)}`
                  : tSafe(t, "wallet.send_payment", "Send payment")}
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground/40 shrink-0" />
          </button>
        )}

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
                style={{ color: "hsl(var(--accent))" }}
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
            background: "hsl(226 24% 14%)",
            border: "1px solid hsl(var(--accent) / 0.2)",
          }}
        >
          <Wallet className="w-4 h-4" style={{ color: "hsl(var(--accent))" }} />
          <span className="text-xs font-bold text-white">
            {tSafe(t, "wallet.manage_full", "Manage Wallet")}
          </span>
        </button>
      </div>
    </AppBottomSheet>
  );
}

export default memo(WalletQuickSheet);

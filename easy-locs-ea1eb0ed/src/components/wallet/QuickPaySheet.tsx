import { useState, useMemo } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useUnifiedPayment } from "@/payments/UnifiedPaymentSystem";
import { useWalletBalance } from "@/payments/wallet-hooks";
import { formatMoney } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { Zap, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

const NAVY = "hsl(226 24% 11%)";
const NAVY_LIGHT = "hsl(226 22% 15%)";
const GOLD = "hsl(var(--accent))";

const QUICK_AMOUNTS = [10, 25, 50, 100, 250, 500];

export interface QuickPayTarget {
  userId: string;
  displayName: string;
  avatarUrl?: string | null;
  phone?: string | null;
  currency?: string;
}

interface QuickPaySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: QuickPayTarget | null;
  defaultAmount?: number;
  onSuccess?: (txId: string) => void;
  contextType?: string;
  contextId?: string | null;
}

export function QuickPaySheet({
  open,
  onOpenChange,
  target,
  defaultAmount,
  onSuccess,
  contextType = "generic",
  contextId = null,
}: QuickPaySheetProps) {
  const { openPayment } = useUnifiedPayment();
  const { balance, currency: walletCurrency } = useWalletBalance();
  const { t } = useI18n();
  const [amount, setAmount] = useState(defaultAmount ? String(defaultAmount) : "");
  const [sending, setSending] = useState(false);

  const currency = target?.currency || walletCurrency || "AED";
  const numAmount = parseFloat(amount) || 0;
  const canSend = numAmount > 0 && numAmount <= balance && target?.userId;

  const initials = useMemo(() => {
    if (!target?.displayName) return "?";
    const parts = target.displayName.trim().split(/\s+/);
    return parts.length >= 2
      ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
      : target.displayName.slice(0, 2).toUpperCase();
  }, [target?.displayName]);

  const handlePay = async () => {
    if (!canSend || !target || sending) return;
    setSending(true);
    try {
      const result = await openPayment({
        amount: numAmount,
        currency,
        title: `Pay ${target.displayName}`,
        subtitle: target.phone || "Quick payment",
        recipientId: target.userId,
        recipientName: target.displayName,
        contextType: contextType as any,
        contextId,
        metadata: { source: "quick_pay" },
      });
      if (result.ok) {
        onSuccess?.(result.transactionId || "");
        onOpenChange(false);
        setAmount("");
      } else if (result.error && result.error !== "Cancelled") {
        toast.error(result.error);
      }
    } finally {
      setSending(false);
    }
  };

  if (!target) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl p-0 max-h-[80vh]">
        <div className="px-5 pt-6 pb-8">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-4 h-4" style={{ color: GOLD }} />
            <span className="text-[10px] font-bold uppercase tracking-[0.15em]" style={{ color: GOLD }}>
              {t("wallet.quickPay") || "Quick Pay"}
            </span>
          </div>

          <div
            className="rounded-2xl p-4 mb-5"
            style={{ background: `linear-gradient(135deg, ${NAVY}, ${NAVY_LIGHT})` }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 overflow-hidden"
                style={{ background: "hsl(var(--accent) / 0.15)" }}
              >
                {target.avatarUrl ? (
                  <img src={target.avatarUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <span className="text-sm font-bold" style={{ color: GOLD }}>{initials}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate" style={{ color: "white" }}>
                  {target.displayName}
                </p>
                {target.phone && (
                  <p className="text-[10px] mt-0.5" style={{ color: "hsl(0 0% 100% / 0.45)" }}>
                    {target.phone}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="text-center mb-4">
            <div className="flex items-center justify-center gap-2">
              <span className="text-lg text-muted-foreground font-bold">{currency}</span>
              <input
                type="number"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                autoFocus
                className="text-5xl font-extrabold text-foreground text-center bg-transparent outline-none w-[180px] tabular-nums"
                style={{ WebkitAppearance: "none", MozAppearance: "textfield" } as React.CSSProperties}
              />
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              {t("wallet.balance") || "Balance"}: {formatMoney(balance, currency)}
              {numAmount > 0 && numAmount <= balance && (
                <span className="ml-1" style={{ color: "hsl(152 60% 42%)" }}>
                  → {formatMoney(balance - numAmount, currency)}
                </span>
              )}
              {numAmount > balance && (
                <span className="ml-1 text-destructive">{t("wallet.insufficient") || "Insufficient"}</span>
              )}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 mb-5">
            {QUICK_AMOUNTS.map((preset) => (
              <button
                key={preset}
                onClick={() => setAmount(String(preset))}
                className="py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95"
                style={{
                  background: numAmount === preset ? GOLD : "hsl(var(--muted) / 0.5)",
                  color: numAmount === preset ? NAVY : "hsl(var(--foreground))",
                }}
              >
                {preset}
              </button>
            ))}
          </div>

          <button
            onClick={handlePay}
            disabled={!canSend || sending}
            className="w-full rounded-2xl px-4 py-4 text-sm font-bold flex items-center justify-center gap-2 active:scale-[0.97] transition-transform disabled:opacity-40"
            style={{ background: GOLD, color: NAVY }}
          >
            <ShieldCheck className="w-4 h-4" />
            {sending
              ? (t("wallet.sending") || "Sending…")
              : numAmount > 0
                ? `${t("wallet.send") || "Send"} ${formatMoney(numAmount, currency)}`
                : (t("wallet.enterAmount") || "Enter amount")}
          </button>

          <div className="flex items-center justify-center gap-1.5 mt-3">
            <ShieldCheck className="w-3 h-3" style={{ color: "hsl(152 60% 42%)" }} />
            <span className="text-[10px] text-muted-foreground">
              {t("wallet.securedByEasyLocs") || "Secured by Easy-Locs Wallet"}
            </span>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

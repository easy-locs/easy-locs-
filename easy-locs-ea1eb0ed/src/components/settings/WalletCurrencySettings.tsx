import { Wallet, Globe, Info } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useWalletBalance } from "@/payments/wallet-hooks";
import { useI18n } from "@/lib/i18n";
import { getWalletDefaultCurrency } from "@/lib/wallet/wallet-config";

export default function WalletCurrencySettings() {
  const { userCurrency } = useAuth();
  const { balance, currency: walletCurrency, loading: walletLoading } = useWalletBalance();
  const { t } = useI18n();

  const activeCurrency = walletCurrency || userCurrency || getWalletDefaultCurrency();

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Wallet className="w-5 h-5 text-primary" />
        <h3 className="text-sm font-bold text-foreground">{t("wallet.currency_preference" as any) || "Wallet Currency"}</h3>
      </div>

      <div className="rounded-2xl p-5 space-y-1" style={{ background: "hsl(var(--muted) / 0.3)", border: "1px solid hsl(var(--border) / 0.15)" }}>
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{t("wallet.your_currency" as any) || "Your wallet currency"}</p>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "hsl(var(--primary) / 0.08)" }}>
            <Globe className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-black text-foreground tabular-nums">{activeCurrency}</p>
            <p className="text-[11px] text-muted-foreground">{t("wallet.single_currency_desc" as any) || "All transactions use this currency"}</p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl p-5 space-y-1" style={{ background: "hsl(var(--muted) / 0.3)", border: "1px solid hsl(var(--border) / 0.15)" }}>
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{t("wallet.current_balance" as any) || "Current balance"}</p>
        <p className="text-xl font-black text-foreground tabular-nums">
          {walletLoading ? "..." : `${balance.toFixed(2)} ${activeCurrency}`}
        </p>
      </div>

      <div className="flex items-start gap-3 rounded-2xl p-4" style={{ background: "hsl(var(--primary) / 0.04)", border: "1px solid hsl(var(--primary) / 0.1)" }}>
        <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-semibold text-foreground">{t("wallet.auto_exchange_title" as any) || "Automatic exchange"}</p>
          <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">
            {t("wallet.auto_exchange_desc" as any) || "When you pay in a different currency, the exchange is handled automatically at the current rate via Stripe. No manual conversion needed."}
          </p>
        </div>
      </div>
    </div>
  );
}

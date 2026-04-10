import { useState, useEffect } from "react";
import { Wallet, Check, Globe, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import OrbitCurrencySelector from "@/components/orbit/payments/OrbitCurrencySelector";
import { useWalletBalance } from "@/payments/wallet-hooks";
import { useI18n } from "@/lib/i18n";

export default function WalletCurrencySettings() {
  const { user, userCurrency, refreshProfile } = useAuth();
  const { balance, currency: walletCurrency, loading: walletLoading } = useWalletBalance();
  const { t } = useI18n();
  const [currency, setCurrency] = useState(userCurrency || "EUR");
  const [showSelector, setShowSelector] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (userCurrency) setCurrency(userCurrency);
  }, [userCurrency]);

  const handleSave = async () => {
    if (!user?.id) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ currency })
      .eq("id", user.id);
    if (error) {
      toast.error(t("wallet.currency_update_failed" as any) || "Failed to update currency");
    } else {
      toast.success(t("wallet.currency_updated" as any) || "Currency updated");
      refreshProfile?.();
    }
    setSaving(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Wallet className="w-5 h-5 text-primary" />
        <h3 className="text-sm font-bold text-foreground">{t("wallet.currency_preference" as any) || "Currency Preference"}</h3>
      </div>

      <div className="rounded-xl bg-muted p-4 space-y-2">
        <p className="text-xs text-muted-foreground">{t("wallet.current_balance" as any) || "Current balance"}</p>
        <p className="text-lg font-bold text-foreground">
          {walletLoading ? "..." : `${balance.toFixed(2)} ${walletCurrency}`}
        </p>
      </div>

      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">{t("wallet.display_currency" as any) || "Display currency"}</p>
        <button
          onClick={() => setShowSelector(true)}
          className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl border border-border bg-background text-sm"
        >
          <span className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-muted-foreground" />
            {currency}
          </span>
          <span className="text-muted-foreground text-xs">{t("wallet.change" as any) || "Change"}</span>
        </button>
      </div>

      <Button onClick={handleSave} disabled={saving || currency === userCurrency} className="w-full" size="sm">
        {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
        {t("wallet.save" as any) || "Save"}
      </Button>

      {showSelector && (
        <OrbitCurrencySelector
          selected={currency}
          onSelect={(c) => { setCurrency(c); setShowSelector(false); }}
          onClose={() => setShowSelector(false)}
        />
      )}
    </div>
  );
}

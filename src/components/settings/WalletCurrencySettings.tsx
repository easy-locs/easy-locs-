/**
 * WalletCurrencySettings — Currency preference selector for Settings page
 * Allows users to set their default currency from 120+ supported currencies.
 */
import { useState, useEffect } from "react";
import { Wallet, Check, Globe, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  SUPPORTED_CURRENCIES,
  FEATURED_CURRENCIES,
} from "@/lib/orbit-payments/types";
import OrbitCurrencySelector from "@/components/orbit/payments/OrbitCurrencySelector";
import { formatLocs } from "@/lib/orbit-payments";
import { useWallet } from "@/hooks/useWallet";

export default function WalletCurrencySettings() {
  const { user, userCurrency, refreshProfile } = useAuth();
  const { balance, loading: walletLoading } = useWallet();
  const [currency, setCurrency] = useState(userCurrency || "EUR");
  const [showSelector, setShowSelector] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (userCurrency) setCurrency(userCurrency);
  }, [userCurrency]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    await supabase
      .from("profiles")
      .update({ currency } as any)
      .eq("id", user.id);
    await refreshProfile?.();
    toast.success("Default currency updated");
    setSaving(false);
  };

  const currencyInfo = SUPPORTED_CURRENCIES[currency];

  if (showSelector) {
    return (
      <div className="ui-card">
        <OrbitCurrencySelector
          selected={currency}
          onSelect={(code) => {
            setCurrency(code);
            setShowSelector(false);
          }}
          onClose={() => setShowSelector(false)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Wallet Balance */}
      <div className="p-5 rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
        <div className="flex items-center gap-2 mb-2">
          <Wallet className="w-5 h-5 text-accent" />
          <span className="text-sm font-medium opacity-80">LOCS Wallet</span>
        </div>
        <p className="text-2xl font-black">
          {walletLoading ? "..." : formatLocs(balance?.balance || 0)}
        </p>
        <p className="text-xs opacity-60 mt-1">1 LOCS = 1 EUR</p>
      </div>

      {/* Default Currency */}
      <div>
        <label className="form-label flex items-center gap-2">
          <Globe className="w-4 h-4 text-muted-foreground" />
          Default Currency
        </label>
        <p className="text-xs text-muted-foreground mb-3">
          This currency will be used by default for payments and conversions.
        </p>

        {/* Featured quick chips */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {FEATURED_CURRENCIES.map((code) => {
            const info = SUPPORTED_CURRENCIES[code];
            return (
              <button
                key={code}
                onClick={() => setCurrency(code)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                  currency === code
                    ? "bg-accent text-accent-foreground border-accent shadow-sm"
                    : "bg-card text-foreground border-border hover:border-accent/40"
                }`}
              >
                {info.symbol} {code}
              </button>
            );
          })}
          <button
            onClick={() => setShowSelector(true)}
            className="px-3 py-1.5 rounded-full text-xs font-medium transition-all border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-accent/40"
          >
            120+ more →
          </button>
        </div>

        {/* Current selection */}
        <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-card">
          <div className="flex items-center gap-3">
            <span className="text-lg">{currencyInfo?.symbol}</span>
            <div>
              <p className="text-sm font-semibold text-foreground">{currency}</p>
              <p className="text-xs text-muted-foreground">{currencyInfo?.name}</p>
            </div>
          </div>
          {currency !== userCurrency && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-accent font-medium">Changed</span>
            </div>
          )}
        </div>
      </div>

      {/* Save */}
      {currency !== userCurrency && (
        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full rounded-xl bg-accent text-accent-foreground hover:bg-accent/90"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <Check className="w-4 h-4 mr-2" />
          )}
          {saving ? "Saving..." : "Save Currency Preference"}
        </Button>
      )}
    </div>
  );
}

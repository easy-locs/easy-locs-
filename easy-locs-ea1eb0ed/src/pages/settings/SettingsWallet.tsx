import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Wallet, Shield, CreditCard } from "lucide-react";
import { useI18n, tSafe } from "@/lib/i18n";
import WalletCurrencySettings from "@/components/settings/WalletCurrencySettings";
import WalletSecuritySettings from "@/components/wallet/WalletSecuritySettings";

type SettingsTab = "currency" | "security";

export default function SettingsWallet() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [tab, setTab] = useState<SettingsTab>("currency");

  const tabs: { key: SettingsTab; icon: typeof Wallet; label: string }[] = [
    { key: "currency", icon: CreditCard, label: tSafe(t, "wallet.currency", "Currency") },
    { key: "security", icon: Shield, label: tSafe(t, "wallet.security", "Security") },
  ];

  return (
    <div className="app-mobile-page flex flex-col" style={{ background: "hsl(var(--background))" }}>
      <header className="flex items-center gap-3 px-4 pt-4 pb-2">
        <button onClick={() => navigate("/wallet")} className="w-9 h-9 rounded-xl flex items-center justify-center active:scale-95" style={{ background: "hsl(var(--muted))" }}>
          <ArrowLeft className="w-4.5 h-4.5" />
        </button>
        <div className="flex items-center gap-2">
          <Wallet className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-bold truncate">{tSafe(t, "wallet.walletSettings", "Wallet Settings")}</h1>
        </div>
      </header>

      <div className="px-4 pb-2 pt-1">
        <div className="app-tab-bar">
          {tabs.map((tb) => {
            const Icon = tb.icon;
            return (
              <button
                key={tb.key}
                onClick={() => setTab(tb.key)}
                className="app-tab"
                data-active={tab === tb.key ? "true" : "false"}
              >
                <Icon className="w-3.5 h-3.5" />
                {tb.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 px-4 pb-24 mt-2 space-y-3 overflow-y-auto">
        {tab === "currency" && (
          <div className="rounded-2xl border p-4" style={{ background: "hsl(var(--card))", borderColor: "hsl(var(--border))" }}>
            <WalletCurrencySettings />
          </div>
        )}
        {tab === "security" && (
          <WalletSecuritySettings />
        )}
      </div>
    </div>
  );
}

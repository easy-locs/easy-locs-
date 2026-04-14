import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Wallet, Shield, CreditCard } from "lucide-react";
import { useI18n, tSafe } from "@/lib/i18n";
import WalletCurrencySettings from "@/components/settings/WalletCurrencySettings";
import WalletSecuritySettings from "@/components/wallet/WalletSecuritySettings";
import { useUiEngine } from "@/hooks/useUiEngine";
import SubPageShell from "@/components/layout/SubPageShell";

type SettingsTab = "currency" | "security";

export default function SettingsWallet() {
  useUiEngine("settings-wallet");
  const navigate = useNavigate();
  const { t } = useI18n();
  const [tab, setTab] = useState<SettingsTab>("currency");

  const tabs: { key: SettingsTab; icon: typeof Wallet; label: string }[] = [
    { key: "currency", icon: CreditCard, label: tSafe(t, "wallet.currency", "Currency") },
    { key: "security", icon: Shield, label: tSafe(t, "wallet.security", "Security") },
  ];

  return (
    <SubPageShell
      title={tSafe(t, "wallet.walletSettings", "Wallet Settings")}
      onBack={() => navigate("/wallet")}
      noContentPad
    >
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

      <div className="px-4 pb-[var(--page-bottom-pad)] mt-2 space-y-3 overflow-y-auto">
        {tab === "currency" && (
          <div className="rounded-2xl border border-border bg-card p-4">
            <WalletCurrencySettings />
          </div>
        )}
        {tab === "security" && (
          <WalletSecuritySettings />
        )}
      </div>
    </SubPageShell>
  );
}

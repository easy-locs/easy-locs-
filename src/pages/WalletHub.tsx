/**
 * WalletHub — Super-app wallet with direct Pay / Receive / Request flows.
 * Uses UniversalActionSheet for all payment entry points.
 * Protected by SecurityGate (PIN/biometric).
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import SecurityGate from "@/components/security/SecurityGate";
import {
  Shield, ChevronRight, ArrowLeft,
  Building2, Link2, ExternalLink,
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useWallet } from "@/hooks/useWallet";
import { formatLocs } from "@/lib/orbit-payments";
import { usePlatformCurrency } from "@/hooks/usePlatformCurrency";
import { useI18n } from "@/lib/i18n";
import OrbitTransactionHistory from "@/components/orbit/payments/OrbitTransactionHistory";
import WalletBalanceCard from "@/components/wallet/WalletBalanceCard";
import WalletSecurityPanel from "@/components/wallet/WalletSecurityPanel";
import WalletActionGrid from "@/components/wallet/WalletActionGrid";
import UniversalActionSheet from "@/components/actions/UniversalActionSheet";
import RentPaymentSheet from "@/components/wallet/RentPaymentSheet";

export type WalletView = "home" | "pay" | "receive" | "request" | "scan" | "history" | "settings" | "rent-pay";

export default function WalletHub() {
  const [searchParams] = useSearchParams();
  const initialView = (searchParams.get("action") as WalletView) || "home";
  const [view, setView] = useState<WalletView>(initialView);
  const { balance, loading, loadWallet } = useWallet();
  const { code, symbol, fmtLocal } = usePlatformCurrency();
  const { t } = useI18n();
  const navigate = useNavigate();

  const [showLocs, setShowLocs] = useState(true);

  const displayBalance = showLocs
    ? formatLocs(balance?.balance || 0)
    : fmtLocal(balance?.balance || 0);

  const displayPurchased = showLocs
    ? (balance?.total_purchased || 0).toFixed(0) + " LOCS"
    : fmtLocal(balance?.total_purchased || 0);

  const displaySpent = showLocs
    ? (balance?.total_spent || 0).toFixed(0) + " LOCS"
    : fmtLocal(balance?.total_spent || 0);

  const displayFrozen = showLocs
    ? formatLocs(balance?.frozen_balance || 0)
    : fmtLocal(balance?.frozen_balance || 0);

  const VIEW_LABELS: Record<WalletView, string> = {
    home: t("orbit.wallet") || "Wallet",
    pay: t("orbit.pay") || "Pay",
    receive: t("orbit.receive") || "Receive",
    request: t("orbit.request") || "Request",
    scan: t("orbit.scan_qr") || "Scan QR",
    history: t("orbit.history") || "History",
    settings: t("orbit.settings_label") || "Settings",
  };

  const renderSubView = () => {
    switch (view) {
      case "pay":
        return <UniversalActionSheet mode="pay" onClose={() => setView("home")} />;
      case "receive":
        return <UniversalActionSheet mode="receive" />;
      case "request":
        return <UniversalActionSheet mode="request" />;
      case "scan":
        navigate("/pay/scan");
        return null;
      case "history":
        return <OrbitTransactionHistory />;
      case "settings":
        return <WalletSecurityPanel />;
      default:
        return null;
    }
  };

  return (
    <SecurityGate label="Wallet" timeoutMinutes={10}>
    <DashboardLayout>
      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        <AnimatePresence mode="wait">
          {view !== "home" ? (
            <motion.div
              key={view}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <div className="flex items-center gap-3 mb-4">
                <Button variant="ghost" size="icon" onClick={() => setView("home")} className="rounded-full shrink-0">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <h2 className="text-lg font-bold text-foreground">{VIEW_LABELS[view] || "Wallet"}</h2>
              </div>
              {renderSubView()}
            </motion.div>
          ) : (
            <motion.div
              key="home"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              {/* Balance Card */}
              <WalletBalanceCard
                loading={loading}
                displayBalance={displayBalance}
                showLocs={showLocs}
                onToggle={() => setShowLocs((v) => !v)}
                currencyCode={code}
                currencySymbol={symbol}
                displayPurchased={displayPurchased}
                displaySpent={displaySpent}
                frozenBalance={balance?.frozen_balance || 0}
                displayFrozen={displayFrozen}
                onOpenSettings={() => navigate("/dashboard/settings?section=wallet")}
                onRefresh={loadWallet}
              />

              {/* Action Grid — 3 primary + secondary row */}
              <WalletActionGrid onAction={setView} />

              {/* Recent Transactions */}
              <div>
                <div className="flex items-center justify-between mb-3 px-1">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    {t("orbit.recent_transactions") || "Recent Transactions"}
                  </h3>
                  <button
                    onClick={() => setView("history")}
                    className="flex items-center gap-1 text-xs text-accent font-medium hover:text-accent/80 transition-colors"
                  >
                    {t("orbit.view_all") || "View all"} <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="rounded-2xl border border-border bg-card overflow-hidden">
                  <OrbitTransactionHistory />
                </div>
              </div>

              {/* Bank Connection */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3 px-1">
                  {t("orbit.bank_connection") || "Bank Connection"}
                </h3>
                <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground">
                        {t("orbit.connect_bank") || "Connect your bank"}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {t("orbit.connect_bank_desc") || "Link your bank account for instant transfers"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50">
                    <Link2 className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground flex-1">
                      {t("orbit.bank_routed") || "All connections routed securely via backend"}
                    </span>
                    <Shield className="w-3 h-3 text-accent/60" />
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full gap-2"
                    onClick={() => navigate("/dashboard/settings?section=wallet")}
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    {t("orbit.manage_bank") || "Manage Bank Accounts"}
                  </Button>
                </div>
              </div>

              {/* Security Footer */}
              <div className="flex items-center justify-center gap-2 text-[10px] text-muted-foreground py-2">
                <Shield className="w-3 h-3" />
                <span>PIN Protected • Server-side validation • Atomic transfers</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </DashboardLayout>
    </SecurityGate>
  );
}

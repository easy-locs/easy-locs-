/**
 * WalletHub v2 — Premium financial cockpit
 * Harmonized with platform design system, clearer section separation
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import SecurityGate from "@/components/security/SecurityGate";
import {
  Shield, ChevronRight, ArrowLeft,
  Building2, Link2, ExternalLink, Fingerprint, Ghost,
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
  const rentCallId = searchParams.get("rentCallId") || null;
  const [view, setView] = useState<WalletView>(rentCallId ? "rent-pay" : initialView);
  const { balance, loading, loadWallet } = useWallet();
  const { code, symbol, fmtLocal } = usePlatformCurrency();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [showLocs, setShowLocs] = useState(true);

  const fmt = (val: number) => showLocs ? formatLocs(val) : fmtLocal(val);
  const fmtSuffix = (val: number) => showLocs ? val.toFixed(0) + " LOCS" : fmtLocal(val);

  const VIEW_LABELS: Record<WalletView, string> = {
    home: t("orbit.wallet") || "Wallet",
    pay: t("orbit.pay") || "Pay",
    receive: t("orbit.receive") || "Receive",
    request: t("orbit.request") || "Request",
    scan: t("orbit.scan_qr") || "Scan QR",
    history: t("orbit.history") || "History",
    settings: t("orbit.settings_label") || "Settings",
    "rent-pay": "Rent Payment",
  };

  const renderSubView = () => {
    switch (view) {
      case "pay": return <UniversalActionSheet mode="pay" onClose={() => setView("home")} />;
      case "receive": return <UniversalActionSheet mode="receive" />;
      case "request": return <UniversalActionSheet mode="request" />;
      case "scan": navigate("/pay/scan"); return null;
      case "history": return <OrbitTransactionHistory />;
      case "settings": return <WalletSecurityPanel />;
      case "rent-pay": return rentCallId ? (
        <RentPaymentSheet rentCallId={rentCallId} onClose={() => setView("home")} onSuccess={() => {}} />
      ) : null;
      default: return null;
    }
  };

  return (
    <SecurityGate label="Wallet" timeoutMinutes={10}>
    <DashboardLayout>
      <div className="max-w-lg mx-auto px-4 py-5 space-y-4">
        <AnimatePresence mode="wait">
          {view !== "home" ? (
            <motion.div
              key={view}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              <div className="flex items-center gap-3 mb-4">
                <Button variant="ghost" size="icon" onClick={() => setView("home")} className="rounded-xl shrink-0 h-9 w-9">
                  <ArrowLeft className="w-4.5 h-4.5" />
                </Button>
                <h2 className="text-sm font-bold text-foreground uppercase tracking-wide">{VIEW_LABELS[view]}</h2>
              </div>
              {renderSubView()}
            </motion.div>
          ) : (
            <motion.div
              key="home"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, x: -16 }}
              className="space-y-4"
            >
              {/* Balance Hero */}
              <WalletBalanceCard
                loading={loading}
                displayBalance={fmt(balance?.balance || 0)}
                showLocs={showLocs}
                onToggle={() => setShowLocs(v => !v)}
                currencyCode={code}
                currencySymbol={symbol}
                displayPurchased={fmtSuffix(balance?.total_purchased || 0)}
                displaySpent={fmtSuffix(balance?.total_spent || 0)}
                frozenBalance={balance?.frozen_balance || 0}
                displayFrozen={fmt(balance?.frozen_balance || 0)}
                onOpenSettings={() => navigate("/dashboard/settings?section=wallet")}
                onRefresh={loadWallet}
              />

              {/* Action Grid — QR Central */}
              <WalletActionGrid onAction={setView} />

              {/* ── Orbit Ghost Thread Strip ── */}
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate("/app/messages")}
                className="w-full flex items-center gap-3 rounded-2xl border border-border bg-card p-3.5 transition-all hover:border-accent/20"
                style={{ boxShadow: "var(--shadow-card)" }}
              >
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "hsl(var(--accent) / 0.1)" }}>
                  <Ghost className="w-4.5 h-4.5" style={{ color: "hsl(var(--accent))" }} />
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-xs font-bold text-foreground">{t("orbit.ghost_threads") || "Orbit Threads"}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{t("orbit.ghost_threads_desc") || "Orders, payments & conversations"}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground/40 shrink-0" />
              </motion.button>

              {/* ── Recent Transactions ── */}
              <div>
                <SectionHeader
                  label={t("orbit.recent_transactions") || "Recent Transactions"}
                  actionLabel={t("orbit.view_all") || "View all"}
                  onAction={() => setView("history")}
                />
                <div className="rounded-2xl border border-border bg-card overflow-hidden" style={{ boxShadow: "var(--shadow-card)" }}>
                  <OrbitTransactionHistory />
                </div>
              </div>

              {/* ── Bank / Payout ── */}
              <div>
                <SectionHeader label={t("orbit.bank_connection") || "Bank & Payouts"} />
                <div className="rounded-2xl border border-border bg-card overflow-hidden" style={{ boxShadow: "var(--shadow-card)" }}>
                  <div className="p-4 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "hsl(var(--primary) / 0.08)" }}>
                      <Building2 className="w-4.5 h-4.5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-foreground">{t("orbit.connect_bank") || "Connect your bank"}</p>
                      <p className="text-[10px] text-muted-foreground">{t("orbit.connect_bank_desc") || "Link your bank for instant transfers"}</p>
                    </div>
                  </div>
                  <div className="px-4 pb-3.5 space-y-2">
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/30">
                      <Link2 className="w-3 h-3 text-muted-foreground/60 shrink-0" />
                      <span className="text-[10px] text-muted-foreground flex-1">{t("orbit.bank_routed") || "Secure, encrypted connection"}</span>
                      <Shield className="w-3 h-3 text-accent/40" />
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full gap-2 rounded-xl text-xs"
                      onClick={() => navigate("/dashboard/settings?section=wallet")}
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      {t("orbit.manage_bank") || "Manage Bank Accounts"}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Security footer */}
              <div className="flex items-center justify-center gap-3 text-[9px] text-muted-foreground/50 py-1">
                <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> PIN Protected</span>
                <span className="w-0.5 h-0.5 rounded-full bg-muted-foreground/20" />
                <span className="flex items-center gap-1"><Fingerprint className="w-3 h-3" /> Atomic transfers</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </DashboardLayout>
    </SecurityGate>
  );
}

/** Reusable section header for wallet sections */
function SectionHeader({ label, actionLabel, onAction }: { label: string; actionLabel?: string; onAction?: () => void }) {
  return (
    <div className="flex items-center justify-between mb-2 px-0.5">
      <h3 className="text-[9px] font-bold uppercase tracking-[0.15em] text-muted-foreground">{label}</h3>
      {actionLabel && onAction && (
        <button onClick={onAction} className="flex items-center gap-0.5 text-[10px] text-accent font-semibold hover:text-accent/80 transition-colors">
          {actionLabel} <ChevronRight className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}

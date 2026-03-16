/**
 * WalletHub — Full-screen Orbit Wallet experience
 * Uses usePlatformCurrency for consistent currency display.
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ScanLine, Shield, ChevronRight, MessageCircle, ArrowLeft,
  Building2, Link2, ExternalLink,
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useWallet } from "@/hooks/useWallet";
import { formatLocs } from "@/lib/orbit-payments";
import { usePlatformCurrency } from "@/hooks/usePlatformCurrency";
import { useI18n } from "@/lib/i18n";
import OrbitSmartPayment from "@/components/orbit/payments/OrbitSmartPayment";
import OrbitPaymentRequest from "@/components/orbit/payments/OrbitPaymentRequest";
import OrbitQRCode from "@/components/orbit/payments/OrbitQRCode";
import OrbitTransactionHistory from "@/components/orbit/payments/OrbitTransactionHistory";
import OrbitWalletPanel from "@/components/orbit/payments/OrbitWalletPanel";
import WalletBalanceCard from "@/components/wallet/WalletBalanceCard";
import WalletSecurityPanel from "@/components/wallet/WalletSecurityPanel";
import WalletActionGrid from "@/components/wallet/WalletActionGrid";

export type WalletView = "home" | "send" | "receive" | "scan" | "my_qr" | "history" | "buy" | "currency" | "settings";

export default function WalletHub() {
  const [searchParams] = useSearchParams();
  const initialView = (searchParams.get("action") as WalletView) || "home";
  const [view, setView] = useState<WalletView>(initialView);
  const { balance, loading, loadWallet } = useWallet();
  const { code, symbol, fmtLocal } = usePlatformCurrency();
  const { t } = useI18n();
  const navigate = useNavigate();

  const recipientUserId = searchParams.get("recipientId") || searchParams.get("recipientUserId") || "";
  const recipientName = searchParams.get("recipientName") || "Recipient";

  // --- Display currency toggle ---
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
    send: t("orbit.send") || "Send",
    receive: t("orbit.receive") || "Receive",
    scan: t("orbit.scan_qr") || "Scan QR",
    my_qr: t("orbit.my_qr") || "My QR",
    history: t("orbit.history") || "History",
    buy: t("orbit.buy_locs") || "Buy LOCS",
    currency: t("orbit.currency") || "Currency",
    settings: t("orbit.settings_label") || "Settings",
  };

  const renderRecipientHint = (mode: "send" | "receive") => (
    <div className="rounded-2xl border border-border bg-card p-5 text-center space-y-3">
      <MessageCircle className="w-10 h-10 mx-auto text-muted-foreground/40" />
      <p className="text-sm font-medium text-foreground">
        {mode === "send"
          ? (t("orbit.select_recipient_send") || "Select a recipient from Orbit chat to send payment.")
          : (t("orbit.select_recipient_receive") || "Open a conversation to request payment.")}
      </p>
      <div className="flex gap-2 justify-center">
        <Button size="sm" onClick={() => navigate("/dashboard/communication")}>
          {t("orbit.open_orbit") || "Open Orbit"}
        </Button>
        <Button size="sm" variant="outline" onClick={() => setView("my_qr")}>
          {t("orbit.use_qr") || "Use My QR"}
        </Button>
      </div>
    </div>
  );

  const renderSubView = () => {
    switch (view) {
      case "send":
        if (!recipientUserId) return renderRecipientHint("send");
        return (
          <OrbitSmartPayment
            recipientUserId={recipientUserId}
            recipientName={recipientName}
            onSuccess={() => setView("home")}
            onCancel={() => setView("home")}
          />
        );
      case "receive":
        if (!recipientUserId) return renderRecipientHint("receive");
        return (
          <OrbitPaymentRequest
            recipientUserId={recipientUserId}
            recipientName={recipientName}
            onSuccess={() => setView("home")}
            onCancel={() => setView("home")}
          />
        );
      case "scan":
        return (
          <div className="flex flex-col items-center justify-center py-12 gap-5 text-center px-6">
            <div className="w-48 h-48 rounded-2xl border-2 border-dashed border-accent/40 flex items-center justify-center bg-muted/30">
              <ScanLine className="w-16 h-16 text-accent/50 animate-pulse" />
            </div>
            <div className="space-y-1.5">
              <p className="text-sm font-medium text-foreground">
                {t("orbit.scan_qr_pay") || "Scan QR Code to Pay"}
              </p>
              <p className="text-xs text-muted-foreground">
                {t("orbit.scan_qr_desc") || "Point your camera at a recipient's QR code to initiate an instant LOCS transfer."}
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={() => setView("my_qr")}>
              {t("orbit.show_my_qr") || "Show My QR Instead"}
            </Button>
          </div>
        );
      case "my_qr":
        return <OrbitQRCode type="static" />;
      case "history":
        return <OrbitTransactionHistory />;
      case "buy":
        return <OrbitWalletPanel />;
      case "currency":
        return (
          <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
            <p className="text-sm font-semibold text-foreground">
              {t("orbit.preferred_currency") || "Preferred currency"}
            </p>
            <p className="text-xs text-muted-foreground">
              {t("orbit.current_detection") || "Current detection"}: {symbol} {code}
            </p>
            <Button size="sm" variant="outline" onClick={() => navigate("/dashboard/settings?section=locale")}>
              {t("orbit.open_currency_settings") || "Open currency settings"}
            </Button>
          </div>
        );
      case "settings":
        return (
          <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
            <p className="text-sm font-semibold text-foreground">
              {t("orbit.wallet_security") || "Wallet security"}
            </p>
            <p className="text-xs text-muted-foreground">
              {t("orbit.wallet_security_desc") || "Manage PIN, payment protection and wallet preferences."}
            </p>
            <Button size="sm" onClick={() => navigate("/dashboard/settings?section=wallet")}>
              {t("orbit.open_wallet_settings") || "Open wallet settings"}
            </Button>
          </div>
        );
      default:
        return null;
    }
  };

  return (
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

              {/* Action Grid */}
              <WalletActionGrid onAction={setView} />

              {/* Recent Transactions Preview */}
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

              {/* Bank Connection Section */}
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
                        {t("orbit.connect_bank_desc") || "Link your bank account for instant pay-by-bank transfers"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50">
                    <Link2 className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground flex-1">
                      {t("orbit.bank_routed") || "All connections routed securely via Easy-Locs backend"}
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
                <span>PIN Protected • Server-side validation • Atomic transfers • HMAC integrity</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </DashboardLayout>
  );
}

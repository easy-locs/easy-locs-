/**
 * WalletHub — Full-screen Orbit Wallet experience
 * Balance, Send, Receive, QR, History, Settings — all in one visible page
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wallet, Send, ArrowDownLeft, ScanLine, QrCode,
  History, Settings, ArrowLeft, TrendingUp, TrendingDown,
  Plus, Shield, ChevronRight, MessageCircle,
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useWallet } from "@/hooks/useWallet";
import { formatLocs, detectLocalCurrency } from "@/lib/orbit-payments";
import { SUPPORTED_CURRENCIES } from "@/lib/orbit-payments/types";
import { useAuth } from "@/contexts/AuthContext";
import OrbitSmartPayment from "@/components/orbit/payments/OrbitSmartPayment";
import OrbitPaymentRequest from "@/components/orbit/payments/OrbitPaymentRequest";
import OrbitQRCode from "@/components/orbit/payments/OrbitQRCode";
import OrbitTransactionHistory from "@/components/orbit/payments/OrbitTransactionHistory";
import OrbitWalletPanel from "@/components/orbit/payments/OrbitWalletPanel";

type WalletView = "home" | "send" | "receive" | "scan" | "my_qr" | "history" | "buy" | "currency" | "settings";

const WALLET_ACTIONS = [
  { key: "send" as WalletView, icon: Send, label: "Send", desc: "Send LOCS", color: "bg-accent" },
  { key: "receive" as WalletView, icon: ArrowDownLeft, label: "Receive", desc: "Request payment", color: "bg-primary" },
  { key: "scan" as WalletView, icon: ScanLine, label: "Scan QR", desc: "Scan to pay", color: "bg-info" },
  { key: "my_qr" as WalletView, icon: QrCode, label: "My QR", desc: "Share your code", color: "bg-success" },
  { key: "history" as WalletView, icon: History, label: "History", desc: "All transactions", color: "bg-muted" },
  { key: "buy" as WalletView, icon: Plus, label: "Buy LOCS", desc: "Add credits", color: "bg-warning" },
  { key: "currency" as WalletView, icon: TrendingUp, label: "Currency", desc: "FX preferences", color: "bg-secondary" },
  { key: "settings" as WalletView, icon: Settings, label: "Settings", desc: "PIN & wallet config", color: "bg-muted" },
];

export default function WalletHub() {
  const [searchParams] = useSearchParams();
  const initialView = (searchParams.get("action") as WalletView) || "home";
  const [view, setView] = useState<WalletView>(initialView);
  const { balance, loading } = useWallet();
  const { userCurrency } = useAuth();
  const detected = detectLocalCurrency({ preferredCurrency: userCurrency || null, accountCountry: null });
  const currencyInfo = SUPPORTED_CURRENCIES[detected.code];
  const navigate = useNavigate();

  const recipientUserId = searchParams.get("recipientId") || searchParams.get("recipientUserId") || "";
  const recipientName = searchParams.get("recipientName") || "Recipient";

  const renderRecipientHint = (mode: "send" | "receive") => (
    <div className="rounded-2xl border border-border bg-card p-5 text-center space-y-3">
      <MessageCircle className="w-10 h-10 mx-auto text-muted-foreground/40" />
      <p className="text-sm font-medium text-foreground">
        {mode === "send" ? "Select a recipient from Orbit chat to send payment." : "Open a conversation to request payment."}
      </p>
      <div className="flex gap-2 justify-center">
        <Button size="sm" onClick={() => navigate("/dashboard/communication")}>Open Orbit</Button>
        <Button size="sm" variant="outline" onClick={() => setView("my_qr")}>Use My QR</Button>
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
          <div className="flex flex-col items-center justify-center py-16 gap-4 text-center px-6">
            <ScanLine className="w-16 h-16 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">
              Point your camera at a QR code to initiate payment.
            </p>
            <p className="text-xs text-muted-foreground/60">
              Camera scanner available on mobile devices.
            </p>
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
            <p className="text-sm font-semibold text-foreground">Preferred currency</p>
            <p className="text-xs text-muted-foreground">Current detection: {currencyInfo?.symbol} {detected.code}</p>
            <Button size="sm" variant="outline" onClick={() => navigate("/dashboard/settings?section=locale")}>Open currency settings</Button>
          </div>
        );
      case "settings":
        return (
          <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
            <p className="text-sm font-semibold text-foreground">Wallet security</p>
            <p className="text-xs text-muted-foreground">Manage PIN, payment protection and wallet preferences.</p>
            <Button size="sm" onClick={() => navigate("/dashboard/settings?section=wallet")}>Open wallet settings</Button>
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
              {/* Sub-view header */}
              <div className="flex items-center gap-3 mb-4">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setView("home")}
                  className="rounded-full shrink-0"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <h2 className="text-lg font-bold text-foreground">
                  {WALLET_ACTIONS.find(a => a.key === view)?.label || "Wallet"}
                </h2>
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
              {/* ── Balance Card ── */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative overflow-hidden rounded-2xl p-6"
                style={{
                  background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.8))",
                }}
              >
                <div className="absolute top-0 right-0 w-32 h-32 rounded-full -translate-y-10 translate-x-10" style={{ background: "hsl(var(--accent) / 0.1)" }} />
                <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full translate-y-8 -translate-x-8" style={{ background: "hsl(var(--accent) / 0.06)" }} />

                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Wallet className="w-5 h-5" style={{ color: "hsl(var(--accent))" }} />
                      <span className="text-sm font-semibold text-primary-foreground/80">Orbit Wallet</span>
                    </div>
                    <button
                      onClick={() => navigate("/dashboard/settings?section=wallet")}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-primary-foreground/60 hover:text-primary-foreground/90 transition-colors"
                      style={{ background: "hsl(0 0% 100% / 0.08)" }}
                    >
                      <Settings className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-medium">Settings</span>
                    </button>
                  </div>

                  <p className="text-4xl font-black text-primary-foreground tracking-tight">
                    {loading ? "..." : formatLocs(balance?.balance || 0)}
                  </p>

                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-xs text-primary-foreground/50">1 LOCS = 1 EUR</span>
                    <span
                      className="text-[10px] px-2 py-0.5 rounded-full text-primary-foreground/70"
                      style={{ background: "hsl(var(--accent) / 0.15)" }}
                    >
                      {currencyInfo?.symbol} {detected.code} detected
                    </span>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-4 mt-4 text-xs text-primary-foreground/60">
                    <span className="flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      Purchased: {(balance?.total_purchased || 0).toFixed(0)}
                    </span>
                    <span className="flex items-center gap-1">
                      <TrendingDown className="w-3 h-3" />
                      Spent: {(balance?.total_spent || 0).toFixed(0)}
                    </span>
                  </div>

                  {(balance?.frozen_balance || 0) > 0 && (
                    <p className="mt-2 text-xs text-primary-foreground/40">
                      🔒 Frozen: {formatLocs(balance!.frozen_balance)}
                    </p>
                  )}
                </div>
              </motion.div>

              {/* ── Action Grid ── */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3 px-1">
                  Quick Actions
                </h3>
                <div className="grid grid-cols-3 gap-2.5">
                  {WALLET_ACTIONS.map((action, i) => {
                    const Icon = action.icon;
                    return (
                      <motion.button
                        key={action.key}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setView(action.key)}
                        className="flex flex-col items-center gap-1.5 p-4 rounded-2xl bg-card border border-border hover:border-accent/30 transition-colors"
                      >
                        <div className={`w-10 h-10 rounded-xl ${action.color} text-primary-foreground flex items-center justify-center`}>
                          <Icon className="w-4.5 h-4.5" />
                        </div>
                        <span className="text-[11px] font-semibold text-foreground">{action.label}</span>
                        <span className="text-[9px] text-muted-foreground leading-tight">{action.desc}</span>
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* ── Recent Transactions Preview ── */}
              <div>
                <div className="flex items-center justify-between mb-3 px-1">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    Recent Transactions
                  </h3>
                  <button
                    onClick={() => setView("history")}
                    className="flex items-center gap-1 text-xs text-accent font-medium hover:text-accent/80 transition-colors"
                  >
                    View all <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="rounded-2xl border border-border bg-card overflow-hidden">
                  <OrbitTransactionHistory />
                </div>
              </div>

              {/* ── Security Footer ── */}
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

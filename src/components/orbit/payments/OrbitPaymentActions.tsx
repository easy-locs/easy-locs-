/**
 * OrbitPaymentActions — Hub for all payment actions in Orbit
 * Pay • Request • Scan QR • My QR • Wallet • History • Settings
 * Full wallet visibility with clear action grid
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  HandCoins,
  ScanLine,
  QrCode,
  Wallet,
  History,
  X,
  ArrowLeft,
  Settings,
  ArrowDownLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useWallet } from "@/hooks/useWallet";
import { formatLocs } from "@/lib/orbit-payments";
import OrbitSmartPayment from "./OrbitSmartPayment";
import OrbitQRCode from "./OrbitQRCode";
import OrbitPaymentRequest from "./OrbitPaymentRequest";
import OrbitTransactionHistory from "./OrbitTransactionHistory";
import OrbitWalletPanel from "./OrbitWalletPanel";
import type { OrbitPaymentAction, PaymentContext } from "@/lib/orbit-payments/types";

interface OrbitPaymentActionsProps {
  /** Pre-set recipient for in-chat context */
  recipientUserId?: string;
  recipientName?: string;
  context?: PaymentContext;
  threadId?: string;
  onClose?: () => void;
}

const ACTIONS: {
  key: OrbitPaymentAction | "settings";
  label: string;
  icon: typeof Send;
  color: string;
  description: string;
}[] = [
  { key: "pay", label: "Send", icon: Send, color: "bg-accent text-accent-foreground", description: "Send money" },
  { key: "request", label: "Receive", icon: ArrowDownLeft, color: "bg-primary text-primary-foreground", description: "Request money" },
  { key: "scan_qr", label: "Scan QR", icon: ScanLine, color: "bg-info text-info-foreground", description: "Scan to pay" },
  { key: "my_qr", label: "My QR", icon: QrCode, color: "bg-success text-success-foreground", description: "Show my code" },
  { key: "history", label: "History", icon: History, color: "bg-muted text-foreground", description: "Transactions" },
  { key: "settings", label: "Settings", icon: Settings, color: "bg-warning/20 text-warning", description: "Wallet settings" },
];

export default function OrbitPaymentActions({
  recipientUserId,
  recipientName,
  context,
  threadId,
  onClose,
}: OrbitPaymentActionsProps) {
  const [activeAction, setActiveAction] = useState<OrbitPaymentAction | "settings" | null>(null);
  const { balance, loading: walletLoading } = useWallet();
  const navigate = useNavigate();

  const handleAction = (action: OrbitPaymentAction | "settings") => {
    if (action === "settings") {
      navigate("/dashboard/settings?section=wallet");
      onClose?.();
      return;
    }
    setActiveAction(action);
  };

  const handleBack = () => setActiveAction(null);

  return (
    <div className="flex flex-col h-full">
      <AnimatePresence mode="wait">
        {!activeAction ? (
          <motion.div
            key="actions-grid"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex flex-col gap-4 p-4"
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground">Orbit Wallet</h2>
              {onClose && (
                <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
                  <X className="w-5 h-5" />
                </Button>
              )}
            </div>

            {/* Balance card */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-primary/80 p-5 text-primary-foreground">
              <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-accent/10 -translate-y-6 translate-x-6" />
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-2">
                  <Wallet className="w-4 h-4 text-accent" />
                  <span className="text-xs font-medium opacity-80">LOCS Balance</span>
                </div>
                <p className="text-2xl font-black">
                  {walletLoading ? "..." : formatLocs(balance?.balance || 0)}
                </p>
                <p className="text-2xs opacity-50 mt-1">1 LOCS = 1 EUR • 0% between users</p>
              </div>
            </div>

            {/* Actions grid */}
            <div className="grid grid-cols-3 gap-2.5">
              {ACTIONS.map((action) => {
                const Icon = action.icon;
                return (
                  <motion.button
                    key={action.key}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => handleAction(action.key)}
                    className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-card border border-border hover:border-accent/30 transition-colors"
                  >
                    <div className={`w-10 h-10 rounded-xl ${action.color} flex items-center justify-center`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-token-xs font-semibold text-foreground">{action.label}</span>
                    <span className="text-micro text-muted-foreground leading-tight">{action.description}</span>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key={activeAction}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex flex-col h-full"
          >
            {/* Back header */}
            <div className="flex items-center gap-2 p-4 border-b border-border">
              <Button variant="ghost" size="icon" onClick={handleBack} className="rounded-full shrink-0">
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <h3 className="text-sm font-semibold text-foreground">
                {ACTIONS.find((a) => a.key === activeAction)?.label}
              </h3>
            </div>

            {/* Action content */}
            <div className="flex-1 overflow-y-auto">
              {activeAction === "pay" && (
                <OrbitSmartPayment
                  recipientUserId={recipientUserId || ""}
                  recipientName={recipientName || "Recipient"}
                  context={context}
                  threadId={threadId}
                  onSuccess={() => {
                    setActiveAction(null);
                    onClose?.();
                  }}
                  onCancel={handleBack}
                />
              )}
              {activeAction === "request" && (
                <OrbitPaymentRequest
                  recipientUserId={recipientUserId}
                  recipientName={recipientName}
                  threadId={threadId}
                  context={context}
                  onSuccess={handleBack}
                  onCancel={handleBack}
                />
              )}
              {activeAction === "scan_qr" && (
                <div className="flex flex-col items-center justify-center py-12 gap-4 text-center px-4">
                  <ScanLine className="w-16 h-16 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">
                    Camera scanner coming soon. Paste a QR code data to process payment.
                  </p>
                </div>
              )}
              {activeAction === "my_qr" && <OrbitQRCode type="static" />}
              {activeAction === "wallet" && <OrbitWalletPanel />}
              {activeAction === "history" && <OrbitTransactionHistory />}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

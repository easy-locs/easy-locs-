import { ScanLine, Link2, Users, ArrowDownLeft, Wallet, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { eventBus } from "@/lib/core/event-bus";

interface PayActionSheetProps {
  onClose: () => void;
}

export default function PayActionSheet({ onClose }: PayActionSheetProps) {
  const actions = [
    {
      key: "scan",
      icon: ScanLine,
      label: "Scan QR",
      desc: "Point camera at a QR code to pay",
      walletAction: "pay",
      intentHint: "wallet_payment",
      scanMode: "qr",
    },
    {
      key: "link",
      icon: Link2,
      label: "Payment link",
      desc: "Paste a payment link or user ID",
      walletAction: "pay",
      intentHint: "wallet_payment",
      scanMode: "link",
    },
    {
      key: "contact",
      icon: Users,
      label: "Send to contact",
      desc: "Transfer money to a user",
      walletAction: "transfer",
      intentHint: "wallet_transfer",
    },
    {
      key: "request",
      icon: ArrowDownLeft,
      label: "Request money",
      desc: "Request a payment from someone",
      walletAction: "request",
      intentHint: "wallet_transfer",
    },
    {
      key: "topup",
      icon: Wallet,
      label: "Top up wallet",
      desc: "Add funds via card or mobile pay",
      walletAction: "topup",
      intentHint: "wallet_topup",
    },
  ];

  return (
    <div className="space-y-2">
      {actions.map((action, i) => {
        const Icon = action.icon;
        return (
          <motion.button
            key={action.key}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => {
              onClose();
              eventBus.emit("wallet.action", {
                action: action.walletAction,
                context: action.key,
                intentHint: action.intentHint,
                scanMode: (action as any).scanMode,
              });
            }}
            className="flex w-full items-center gap-4 rounded-2xl border border-border/20 bg-card p-4 text-left transition-all active:scale-[0.97]"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">{action.label}</p>
              <p className="text-[11px] text-muted-foreground">{action.desc}</p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground/40" />
          </motion.button>
        );
      })}
    </div>
  );
}

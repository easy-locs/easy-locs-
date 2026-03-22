/**
 * PayActionSheet — Harmonized action sheet for all payment flows.
 * 5 clear options: Scan, Link, Contact, Request, Top Up.
 */
import { useState } from "react";
import { ScanLine, Link2, Users, ArrowDownLeft, Wallet, ArrowRight, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

interface PayActionSheetProps {
  onClose: () => void;
}

export default function PayActionSheet({ onClose }: PayActionSheetProps) {
  const navigate = useNavigate();

  const actions = [
    {
      key: "scan",
      icon: ScanLine,
      label: "Scan QR",
      desc: "Point camera at a QR code to pay",
      route: "/pay/scan",
    },
    {
      key: "link",
      icon: Link2,
      label: "Payment link",
      desc: "Paste a payment link or user ID",
      route: "/pay/link-resolver",
    },
    {
      key: "contact",
      icon: Users,
      label: "Send to contact",
      desc: "Transfer money to a user",
      route: "/wallet/transfer",
    },
    {
      key: "request",
      icon: ArrowDownLeft,
      label: "Request money",
      desc: "Request a payment from someone",
      route: "/wallet/request",
    },
    {
      key: "topup",
      icon: Wallet,
      label: "Top up wallet",
      desc: "Add funds via card or mobile pay",
      route: "/wallet/top-up",
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
              navigate(action.route);
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

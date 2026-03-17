/**
 * WalletActionGrid — 3 primary actions (Pay, Receive, Request) + secondary row
 * Super-app style: direct, no intermediate screens.
 */
import { motion } from "framer-motion";
import {
  Send, ArrowDownLeft, FileText,
  History, ScanLine, Settings,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import type { WalletView } from "@/pages/WalletHub";

interface WalletActionGridProps {
  onAction: (view: WalletView) => void;
}

export default function WalletActionGrid({ onAction }: WalletActionGridProps) {
  const { t } = useI18n();

  const PRIMARY_ACTIONS: { key: WalletView; icon: typeof Send; label: string; desc: string }[] = [
    { key: "pay", icon: Send, label: t("orbit.pay") || "Pay", desc: t("orbit.send_money") || "Send money" },
    { key: "receive", icon: ArrowDownLeft, label: t("orbit.receive") || "Receive", desc: t("orbit.my_qr_code") || "My QR code" },
    { key: "request", icon: FileText, label: t("orbit.request") || "Request", desc: t("orbit.request_money") || "Request money" },
  ];

  const SECONDARY_ACTIONS: { key: WalletView; icon: typeof History; label: string }[] = [
    { key: "history", icon: History, label: t("orbit.history") || "History" },
    { key: "scan", icon: ScanLine, label: t("orbit.scan_qr") || "Scan" },
    { key: "settings", icon: Settings, label: t("orbit.settings_label") || "Settings" },
  ];

  return (
    <div className="space-y-4">
      {/* Primary 3 actions */}
      <div className="grid grid-cols-3 gap-3">
        {PRIMARY_ACTIONS.map((action, i) => {
          const Icon = action.icon;
          return (
            <motion.button
              key={action.key}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onAction(action.key)}
              className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-5 transition hover:border-accent/40 hover:shadow-md active:scale-[0.97]"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
                <Icon className="h-5 w-5" />
              </div>
              <span className="text-sm font-bold text-foreground">{action.label}</span>
              <span className="text-[10px] text-muted-foreground leading-tight">{action.desc}</span>
            </motion.button>
          );
        })}
      </div>

      {/* Secondary row */}
      <div className="flex gap-2">
        {SECONDARY_ACTIONS.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.key}
              type="button"
              onClick={() => onAction(action.key)}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5 text-xs font-semibold text-muted-foreground transition hover:text-foreground hover:bg-muted"
            >
              <Icon className="h-3.5 w-3.5" />
              {action.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

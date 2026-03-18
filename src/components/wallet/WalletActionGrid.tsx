/**
 * WalletActionGrid v2 — Premium QR-central action hub
 * Harmonized design tokens, stronger QR/payment centrality
 */
import { motion } from "framer-motion";
import {
  Send, QrCode, ArrowDownLeft, FileText,
  History, ScanLine, Settings, Banknote,
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
    { key: "receive", icon: QrCode, label: t("orbit.receive") || "Receive", desc: t("orbit.my_qr_code") || "My QR" },
    { key: "request", icon: FileText, label: t("orbit.request") || "Request", desc: t("orbit.request_money") || "Request" },
  ];

  const SECONDARY_ACTIONS: { key: WalletView; icon: typeof History; label: string }[] = [
    { key: "history", icon: History, label: t("orbit.history") || "History" },
    { key: "scan", icon: ScanLine, label: t("orbit.scan_qr") || "Scan" },
    { key: "settings", icon: Settings, label: t("orbit.settings_label") || "Settings" },
  ];

  return (
    <div className="space-y-2.5">
      {/* Primary 3 actions — elevated cards */}
      <div className="grid grid-cols-3 gap-2">
        {PRIMARY_ACTIONS.map((action, i) => {
          const Icon = action.icon;
          const isCenter = i === 1; // QR/Receive = center = hero
          return (
            <motion.button
              key={action.key}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onAction(action.key)}
              className="flex flex-col items-center gap-2 rounded-2xl border p-3.5 transition-all active:scale-[0.96]"
              style={{
                borderColor: isCenter ? "hsl(var(--accent) / 0.25)" : "hsl(var(--border))",
                background: isCenter ? "hsl(var(--accent) / 0.06)" : "hsl(var(--card))",
                boxShadow: isCenter ? "var(--shadow-gold)" : "var(--shadow-card)",
              }}
            >
              <div
                className="flex h-11 w-11 items-center justify-center rounded-xl"
                style={{
                  background: isCenter ? "var(--gradient-gold)" : "hsl(var(--primary) / 0.08)",
                  boxShadow: isCenter ? "0 4px 12px hsl(var(--accent) / 0.2)" : "none",
                }}
              >
                <Icon className="h-5 w-5" style={{ color: isCenter ? "hsl(var(--accent-foreground))" : "hsl(var(--primary))" }} />
              </div>
              <div className="text-center">
                <span className="block text-xs font-bold text-foreground">{action.label}</span>
                <span className="block text-[9px] text-muted-foreground leading-tight mt-0.5">{action.desc}</span>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Secondary row — compact chips */}
      <div className="flex gap-1.5">
        {SECONDARY_ACTIONS.map((action) => {
          const Icon = action.icon;
          return (
            <motion.button
              key={action.key}
              whileTap={{ scale: 0.96 }}
              type="button"
              onClick={() => onAction(action.key)}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-2.5 py-2 text-[11px] font-semibold text-muted-foreground transition-all hover:text-foreground hover:bg-muted/50 active:scale-[0.97]"
              style={{ boxShadow: "var(--shadow-card)" }}
            >
              <Icon className="h-3.5 w-3.5" />
              {action.label}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

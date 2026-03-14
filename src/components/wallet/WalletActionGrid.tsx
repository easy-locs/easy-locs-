/**
 * WalletActionGrid — 4-column action grid for wallet quick actions
 * Uses semantic design tokens only — no hardcoded colors
 */
import { motion } from "framer-motion";
import {
  Send, ArrowDownLeft, ScanLine, QrCode,
  History, Plus, TrendingUp, Settings,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import type { WalletView } from "@/pages/WalletHub";

interface WalletActionGridProps {
  onAction: (view: WalletView) => void;
}

export default function WalletActionGrid({ onAction }: WalletActionGridProps) {
  const { t } = useI18n();

  const WALLET_ACTIONS: { key: WalletView; icon: typeof Send; label: string; desc: string; style: React.CSSProperties }[] = [
    { key: "send", icon: Send, label: t("orbit.send") || "Send", desc: t("orbit.send_locs") || "Send LOCS", style: { background: "hsl(var(--accent))" } },
    { key: "receive", icon: ArrowDownLeft, label: t("orbit.receive") || "Receive", desc: t("orbit.request_payment") || "Request payment", style: { background: "hsl(var(--primary))" } },
    { key: "scan", icon: ScanLine, label: t("orbit.scan_qr") || "Scan QR", desc: t("orbit.scan_to_pay") || "Scan to pay", style: { background: "hsl(var(--primary) / 0.7)" } },
    { key: "my_qr", icon: QrCode, label: t("orbit.my_qr") || "My QR", desc: t("orbit.share_code") || "Share your code", style: { background: "hsl(var(--accent) / 0.8)" } },
    { key: "history", icon: History, label: t("orbit.history") || "History", desc: t("orbit.all_transactions") || "All transactions", style: { background: "hsl(var(--muted-foreground) / 0.6)" } },
    { key: "buy", icon: Plus, label: t("orbit.buy_locs") || "Buy LOCS", desc: t("orbit.add_credits") || "Add credits", style: { background: "hsl(var(--ring))" } },
    { key: "currency", icon: TrendingUp, label: t("orbit.currency") || "Currency", desc: t("orbit.fx_preferences") || "FX preferences", style: { background: "hsl(var(--secondary-foreground) / 0.5)" } },
    { key: "settings", icon: Settings, label: t("orbit.settings_label") || "Settings", desc: t("orbit.pin_security") || "PIN & security", style: { background: "hsl(var(--muted-foreground) / 0.4)" } },
  ];

  return (
    <div>
      <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3 px-1">
        {t("orbit.quick_actions") || "Quick Actions"}
      </h3>
      <div className="grid grid-cols-4 gap-2.5">
        {WALLET_ACTIONS.map((action, i) => {
          const Icon = action.icon;
          return (
            <motion.button
              key={action.key}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onAction(action.key)}
              className="flex flex-col items-center gap-1.5 p-4 rounded-2xl bg-card border border-border hover:border-accent/40 hover:shadow-md transition-all"
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm text-primary-foreground"
                style={action.style}
              >
                <Icon className="w-4.5 h-4.5" />
              </div>
              <span className="text-[11px] font-semibold text-foreground">{action.label}</span>
              <span className="text-[9px] text-muted-foreground leading-tight">{action.desc}</span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

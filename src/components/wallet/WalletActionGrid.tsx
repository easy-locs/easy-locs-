/**
 * WalletActionGrid — 4-column action grid for wallet quick actions
 */
import { motion } from "framer-motion";
import {
  Send, ArrowDownLeft, ScanLine, QrCode,
  History, Plus, TrendingUp, Settings,
} from "lucide-react";
import type { WalletView } from "@/pages/WalletHub";

const WALLET_ACTIONS: { key: WalletView; icon: typeof Send; label: string; desc: string; gradient: string }[] = [
  { key: "send", icon: Send, label: "Send", desc: "Send LOCS", gradient: "from-accent to-accent/80" },
  { key: "receive", icon: ArrowDownLeft, label: "Receive", desc: "Request payment", gradient: "from-primary to-primary/80" },
  { key: "scan", icon: ScanLine, label: "Scan QR", desc: "Scan to pay", gradient: "from-blue-500 to-blue-600" },
  { key: "my_qr", icon: QrCode, label: "My QR", desc: "Share your code", gradient: "from-emerald-500 to-emerald-600" },
  { key: "history", icon: History, label: "History", desc: "All transactions", gradient: "from-muted-foreground/60 to-muted-foreground/40" },
  { key: "buy", icon: Plus, label: "Buy LOCS", desc: "Add credits", gradient: "from-amber-500 to-amber-600" },
  { key: "currency", icon: TrendingUp, label: "Currency", desc: "FX preferences", gradient: "from-secondary to-secondary/80" },
  { key: "settings", icon: Settings, label: "Settings", desc: "PIN & security", gradient: "from-muted-foreground/50 to-muted-foreground/30" },
];

interface WalletActionGridProps {
  onAction: (view: WalletView) => void;
}

export default function WalletActionGrid({ onAction }: WalletActionGridProps) {
  return (
    <div>
      <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3 px-1">
        Quick Actions
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
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${action.gradient} text-white flex items-center justify-center shadow-sm`}>
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

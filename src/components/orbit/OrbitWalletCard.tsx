/**
 * OrbitWalletCard — Prominent wallet card for OrbitHome & Dashboard
 * Shows balance in user's saved currency with toggle to LOCS
 */
import { useState } from "react";
import { motion } from "framer-motion";
import {
  Wallet, Send, ArrowDownLeft, QrCode, ScanLine,
  History, Settings, RefreshCw,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useWallet } from "@/hooks/useWallet";
import { formatLocs } from "@/lib/orbit-payments";
import { usePlatformCurrency } from "@/hooks/usePlatformCurrency";
import { useI18n } from "@/lib/i18n";

const QUICK_ACTIONS = [
  { icon: Send, label: "send", key: "send" },
  { icon: ArrowDownLeft, label: "receive", key: "receive" },
  { icon: ScanLine, label: "scan", key: "scan" },
  { icon: QrCode, label: "my_qr", key: "my_qr" },
  { icon: History, label: "history", key: "history" },
];

export default function OrbitWalletCard() {
  const { balance, loading } = useWallet();
  const { code, symbol, fmtLocal, fmtLocs } = usePlatformCurrency();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [showLocs, setShowLocs] = useState(false);

  const bal = balance?.balance || 0;
  const displayBalance = showLocs ? formatLocs(bal) : fmtLocal(bal);

  return (
    <div className="w-full max-w-md">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl p-5"
        style={{
          background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.8))",
        }}
      >
        {/* Decorative circles */}
        <div className="absolute top-0 right-0 w-28 h-28 rounded-full -translate-y-8 translate-x-8" style={{ background: "hsl(var(--accent) / 0.1)" }} />
        <div className="absolute bottom-0 left-0 w-20 h-20 rounded-full translate-y-6 -translate-x-6" style={{ background: "hsl(var(--accent) / 0.06)" }} />

        <div className="relative z-10">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Wallet className="w-5 h-5" style={{ color: "hsl(var(--accent))" }} />
              <span className="text-sm font-semibold text-primary-foreground/80">
                {t("orbit.wallet_title") || "Orbit Wallet"}
              </span>
            </div>
            <button
              onClick={() => navigate("/dashboard/settings?section=wallet")}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-primary-foreground/60 hover:text-primary-foreground/90 transition-colors"
              style={{ background: "hsl(0 0% 100% / 0.08)" }}
            >
              <Settings className="w-3.5 h-3.5" />
              <span className="text-[10px] font-medium">{t("orbit.settings_label") || "Settings"}</span>
            </button>
          </div>

          {/* Balance + Currency Toggle */}
          <div className="flex items-end gap-3">
            <p className="text-3xl font-black text-primary-foreground tracking-tight">
              {loading ? "..." : displayBalance}
            </p>
            <button
              onClick={() => setShowLocs((v) => !v)}
              className="flex items-center gap-1 mb-1 px-2 py-0.5 rounded-full text-primary-foreground/70 hover:text-primary-foreground transition-colors"
              style={{ background: "hsl(0 0% 100% / 0.12)" }}
              title={showLocs ? `Show in ${code}` : "Show in LOCS"}
            >
              <RefreshCw className="w-3 h-3" />
              <span className="text-[10px] font-semibold">
                {showLocs ? code : "LOCS"}
              </span>
            </button>
          </div>

          {/* Rate info */}
          <div className="flex items-center gap-3 mt-2">
            <span className="text-xs text-primary-foreground/50">1 LOCS = 1 EUR</span>
            <span
              className="text-[10px] px-2 py-0.5 rounded-full text-primary-foreground/70"
              style={{ background: "hsl(var(--accent) / 0.15)" }}
            >
              {showLocs ? "LOCS" : `${symbol} ${code}`} {t("orbit.mode") || "mode"}
            </span>
          </div>

          {/* Quick Actions Row */}
          <div className="flex items-center gap-2 mt-4">
            {QUICK_ACTIONS.map((action) => {
              const Icon = action.icon;
              return (
                <motion.button
                  key={action.key}
                  whileTap={{ scale: 0.92 }}
                  className="flex flex-col items-center gap-1 flex-1 py-2 rounded-xl transition-colors"
                  style={{ background: "hsl(0 0% 100% / 0.1)" }}
                  onClick={() => navigate(`/dashboard/wallet?action=${action.key}`)}
                >
                  <Icon className="w-4 h-4 text-primary-foreground" />
                  <span className="text-[10px] font-semibold text-primary-foreground/80">
                    {t(`orbit.${action.label}`) || action.label}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

/**
 * WalletBalanceCard — Shows LOCS or local currency balance with toggle
 * PASS58: Added refresh button, last updated indicator
 */
import { useState } from "react";
import { motion } from "framer-motion";
import { Wallet, Settings, TrendingUp, TrendingDown, RefreshCw, Loader2, Ghost } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useGhostMask } from "@/hooks/useGhostMask";

interface WalletBalanceCardProps {
  loading: boolean;
  displayBalance: string;
  showLocs: boolean;
  onToggle: () => void;
  currencyCode: string;
  currencySymbol: string;
  displayPurchased: string;
  displaySpent: string;
  frozenBalance: number;
  displayFrozen: string;
  onOpenSettings: () => void;
  onRefresh?: () => Promise<void> | void;
}

export default function WalletBalanceCard({
  loading, displayBalance, showLocs, onToggle,
  currencyCode, currencySymbol, displayPurchased, displaySpent,
  frozenBalance, displayFrozen, onOpenSettings, onRefresh,
}: WalletBalanceCardProps) {
  const { t } = useI18n();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (!onRefresh || refreshing) return;
    setRefreshing(true);
    try { await onRefresh(); } finally { setRefreshing(false); }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl p-6"
      style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.8))" }}
    >
      {/* Decorative circles */}
      <div className="absolute top-0 right-0 w-32 h-32 rounded-full -translate-y-10 translate-x-10" style={{ background: "hsl(var(--accent) / 0.1)" }} />
      <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full translate-y-8 -translate-x-8" style={{ background: "hsl(var(--accent) / 0.06)" }} />

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Wallet className="w-5 h-5" style={{ color: "hsl(var(--accent))" }} />
            <span className="text-sm font-semibold text-primary-foreground/80">
              {t("orbit.wallet_title") || "Orbit Wallet"}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {onRefresh && (
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center justify-center w-8 h-8 min-h-[44px] min-w-[44px] rounded-lg text-primary-foreground/60 hover:text-primary-foreground/90 transition-colors"
                style={{ background: "hsl(0 0% 100% / 0.08)" }}
                title={t("orbit.refresh_balance") || "Refresh balance"}
              >
                {refreshing ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5" />
                )}
              </button>
            )}
            <button
              onClick={onOpenSettings}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-primary-foreground/60 hover:text-primary-foreground/90 transition-colors"
              style={{ background: "hsl(0 0% 100% / 0.08)" }}
            >
              <Settings className="w-3.5 h-3.5" />
              <span className="text-[10px] font-medium">{t("orbit.settings_label") || "Settings"}</span>
            </button>
          </div>
        </div>

        {/* Balance + Toggle */}
        <div className="flex items-end gap-3">
          <p className="text-4xl font-black text-primary-foreground tracking-tight">
            {loading ? "..." : displayBalance}
          </p>
          <button
            onClick={onToggle}
            className="flex items-center gap-1 mb-1 px-2 py-0.5 rounded-full text-primary-foreground/70 hover:text-primary-foreground transition-colors"
            style={{ background: "hsl(0 0% 100% / 0.12)" }}
            title={showLocs ? `${t("orbit.show_in") || "Show in"} ${currencyCode}` : `${t("orbit.show_in") || "Show in"} LOCS`}
          >
            <RefreshCw className="w-3 h-3" />
            <span className="text-[10px] font-semibold">
              {showLocs ? currencyCode : "LOCS"}
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
            {showLocs ? "LOCS" : `${currencySymbol} ${currencyCode}`} {t("orbit.mode") || "mode"}
          </span>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 mt-4 text-xs text-primary-foreground/60">
          <span className="flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            {t("orbit.purchased") || "Purchased"}: {displayPurchased}
          </span>
          <span className="flex items-center gap-1">
            <TrendingDown className="w-3 h-3" />
            {t("orbit.spent") || "Spent"}: {displaySpent}
          </span>
        </div>

        {frozenBalance > 0 && (
          <p className="mt-2 text-xs text-primary-foreground/40">
            🔒 {t("orbit.frozen") || "Frozen"}: {displayFrozen}
          </p>
        )}
      </div>
    </motion.div>
  );
}

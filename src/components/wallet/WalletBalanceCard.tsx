/**
 * WalletBalanceCard — Premium financial cockpit hero card v2
 * Harmonized with platform design tokens + Orbit Ghost centrality
 */
import { useState } from "react";
import { motion } from "framer-motion";
import { Wallet, Settings, TrendingUp, TrendingDown, RefreshCw, Loader2, Ghost, Lock, QrCode } from "lucide-react";
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
  const { isGhost } = useGhostMask();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (!onRefresh || refreshing) return;
    setRefreshing(true);
    try { await onRefresh(); } finally { setRefreshing(false); }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="relative overflow-hidden"
      style={{
        borderRadius: "var(--card-radius)",
        background: "var(--gradient-hero)",
        boxShadow: "var(--shadow-elevated)",
      }}
    >
      {/* Ambient orbs — GPU-friendly */}
      <div className="absolute top-0 right-0 w-36 h-36 rounded-full -translate-y-14 translate-x-14 opacity-40" style={{ background: "radial-gradient(circle, hsl(var(--accent) / 0.18), transparent 70%)" }} />
      <div className="absolute bottom-0 left-0 w-28 h-28 rounded-full translate-y-10 -translate-x-10 opacity-30" style={{ background: "radial-gradient(circle, hsl(var(--accent) / 0.1), transparent 70%)" }} />

      <div className="relative z-10 p-5">
        {/* Header row */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "hsl(var(--accent) / 0.15)" }}>
              <Wallet className="w-4.5 h-4.5" style={{ color: "hsl(var(--accent))" }} />
            </div>
            <div>
              <span className="text-[11px] font-bold text-white/90 tracking-wide uppercase">
                {t("orbit.wallet_title") || "Orbit Wallet"}
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "hsl(var(--success))" }} />
                <span className="text-[9px] text-white/40 font-medium">{t("orbit.active") || "Active"}</span>
                {isGhost && (
                  <span className="flex items-center gap-1 ml-1 px-1.5 py-0.5 rounded-full" style={{ background: "hsl(0 0% 100% / 0.06)" }}>
                    <Ghost className="w-2.5 h-2.5 text-white/30" />
                    <span className="text-[8px] text-white/30 font-semibold">Ghost</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {onRefresh && (
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center justify-center w-8 h-8 rounded-lg text-white/40 hover:text-white/70 transition-all hover:bg-white/5 active:scale-95"
              >
                {refreshing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              </button>
            )}
            <button
              onClick={onOpenSettings}
              className="flex items-center justify-center w-8 h-8 rounded-lg text-white/40 hover:text-white/70 transition-all hover:bg-white/5 active:scale-95"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Balance hero */}
        <div className="mb-1.5">
          <p className="text-[9px] font-bold text-white/35 uppercase tracking-[0.15em] mb-1.5">
            {t("orbit.total_balance") || "Total Balance"}
          </p>
          <p className="text-[2.25rem] font-black text-white tracking-tight leading-none">
            {loading ? (
              <span className="inline-flex gap-1.5">
                <span className="w-4 h-9 rounded-md bg-white/8 animate-pulse" />
                <span className="w-20 h-9 rounded-md bg-white/8 animate-pulse" />
              </span>
            ) : isGhost ? "••••••" : displayBalance}
          </p>
        </div>

        {/* Currency toggle */}
        <div className="flex items-center gap-2.5 mb-4">
          <button
            onClick={onToggle}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-white/60 hover:text-white/90 transition-all active:scale-95"
            style={{ background: "hsl(0 0% 100% / 0.08)" }}
          >
            <RefreshCw className="w-2.5 h-2.5" />
            <span className="text-[10px] font-bold">{showLocs ? currencyCode : "LOCS"}</span>
          </button>
          <span className="text-[9px] text-white/25 font-medium">1 LOCS = 1 EUR</span>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl px-3 py-2.5" style={{ background: "hsl(0 0% 100% / 0.05)" }}>
            <div className="flex items-center gap-1.5 mb-0.5">
              <TrendingUp className="w-3 h-3" style={{ color: "hsl(var(--success))" }} />
              <span className="text-[8px] font-bold text-white/35 uppercase tracking-wider">
                {t("orbit.purchased") || "Purchased"}
              </span>
            </div>
            <p className="text-[13px] font-bold text-white/75">{isGhost ? "••••" : displayPurchased}</p>
          </div>
          <div className="rounded-xl px-3 py-2.5" style={{ background: "hsl(0 0% 100% / 0.05)" }}>
            <div className="flex items-center gap-1.5 mb-0.5">
              <TrendingDown className="w-3 h-3 text-destructive/80" />
              <span className="text-[8px] font-bold text-white/35 uppercase tracking-wider">
                {t("orbit.spent") || "Spent"}
              </span>
            </div>
            <p className="text-[13px] font-bold text-white/75">{isGhost ? "••••" : displaySpent}</p>
          </div>
        </div>

        {frozenBalance > 0 && !isGhost && (
          <div className="flex items-center gap-2 mt-2 px-3 py-2 rounded-lg" style={{ background: "hsl(0 0% 100% / 0.04)" }}>
            <Lock className="w-3 h-3 text-white/25" />
            <span className="text-[10px] text-white/35 font-medium">
              {t("orbit.frozen") || "Frozen"}: {displayFrozen}
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

/**
 * WalletBalanceCard — Premium financial cockpit hero card
 */
import { useState } from "react";
import { motion } from "framer-motion";
import { Wallet, Settings, TrendingUp, TrendingDown, RefreshCw, Loader2, Ghost, Lock } from "lucide-react";
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
      className="relative overflow-hidden rounded-3xl"
      style={{
        background: "linear-gradient(145deg, hsl(var(--primary)), hsl(var(--primary) / 0.75))",
        boxShadow: "0 20px 60px -15px hsl(var(--primary) / 0.35), inset 0 1px 0 hsl(0 0% 100% / 0.06)",
      }}
    >
      {/* Decorative ambient elements */}
      <div className="absolute top-0 right-0 w-40 h-40 rounded-full -translate-y-16 translate-x-16" style={{ background: "radial-gradient(circle, hsl(var(--accent) / 0.12), transparent 70%)" }} />
      <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full translate-y-12 -translate-x-12" style={{ background: "radial-gradient(circle, hsl(var(--accent) / 0.06), transparent 70%)" }} />
      <div className="absolute top-1/2 left-1/2 w-64 h-64 -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ background: "radial-gradient(circle, hsl(0 0% 100% / 0.02), transparent 60%)" }} />

      <div className="relative z-10 p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "hsl(var(--accent) / 0.15)" }}>
              <Wallet className="w-4 h-4" style={{ color: "hsl(var(--accent))" }} />
            </div>
            <div>
              <span className="text-xs font-bold text-primary-foreground/90 tracking-wide">
                {t("orbit.wallet_title") || "Orbit Wallet"}
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[9px] text-primary-foreground/40 font-medium">{t("orbit.active") || "Active"}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {onRefresh && (
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center justify-center w-9 h-9 rounded-xl text-primary-foreground/50 hover:text-primary-foreground/80 transition-all hover:bg-white/8 active:scale-95"
                title={t("orbit.refresh_balance") || "Refresh"}
              >
                {refreshing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
              </button>
            )}
            <button
              onClick={onOpenSettings}
              className="flex items-center justify-center w-9 h-9 rounded-xl text-primary-foreground/50 hover:text-primary-foreground/80 transition-all hover:bg-white/8 active:scale-95"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Balance display */}
        <div className="mb-1">
          <p className="text-[10px] font-medium text-primary-foreground/40 uppercase tracking-widest mb-1">
            {t("orbit.total_balance") || "Total Balance"}
          </p>
          <div className="flex items-baseline gap-3">
            <p className="text-[2.5rem] font-black text-primary-foreground tracking-tight leading-none">
              {loading ? (
                <span className="inline-flex gap-1">
                  <span className="w-3 h-8 rounded bg-primary-foreground/10 animate-pulse" />
                  <span className="w-16 h-8 rounded bg-primary-foreground/10 animate-pulse" />
                </span>
              ) : isGhost ? "••••••" : displayBalance}
            </p>
          </div>
        </div>

        {/* Currency toggle + ghost indicator */}
        <div className="flex items-center gap-2 mb-5">
          <button
            onClick={onToggle}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full text-primary-foreground/70 hover:text-primary-foreground transition-all active:scale-95"
            style={{ background: "hsl(0 0% 100% / 0.1)", backdropFilter: "blur(8px)" }}
            title={showLocs ? `${t("orbit.show_in") || "Show in"} ${currencyCode}` : `${t("orbit.show_in") || "Show in"} LOCS`}
          >
            <RefreshCw className="w-3 h-3" />
            <span className="text-[10px] font-bold">
              {showLocs ? currencyCode : "LOCS"}
            </span>
          </button>
          <span className="text-[10px] text-primary-foreground/30 font-medium">1 LOCS = 1 EUR</span>
          {isGhost && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-primary-foreground/30" style={{ background: "hsl(0 0% 100% / 0.06)" }}>
              <Ghost className="w-3 h-3" />
              <span className="text-[9px] font-medium">Hidden</span>
            </span>
          )}
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl p-3" style={{ background: "hsl(0 0% 100% / 0.06)" }}>
            <div className="flex items-center gap-1.5 mb-1">
              <TrendingUp className="w-3 h-3 text-emerald-400" />
              <span className="text-[9px] font-bold text-primary-foreground/40 uppercase tracking-wider">
                {t("orbit.purchased") || "Purchased"}
              </span>
            </div>
            <p className="text-sm font-bold text-primary-foreground/80">
              {isGhost ? "••••" : displayPurchased}
            </p>
          </div>
          <div className="rounded-xl p-3" style={{ background: "hsl(0 0% 100% / 0.06)" }}>
            <div className="flex items-center gap-1.5 mb-1">
              <TrendingDown className="w-3 h-3 text-rose-400" />
              <span className="text-[9px] font-bold text-primary-foreground/40 uppercase tracking-wider">
                {t("orbit.spent") || "Spent"}
              </span>
            </div>
            <p className="text-sm font-bold text-primary-foreground/80">
              {isGhost ? "••••" : displaySpent}
            </p>
          </div>
        </div>

        {frozenBalance > 0 && !isGhost && (
          <div className="flex items-center gap-2 mt-3 px-3 py-2 rounded-xl" style={{ background: "hsl(0 0% 100% / 0.04)" }}>
            <Lock className="w-3 h-3 text-primary-foreground/30" />
            <span className="text-[10px] text-primary-foreground/40 font-medium">
              {t("orbit.frozen") || "Frozen"}: {displayFrozen}
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

import { useNavigate } from "react-router-dom";
import { typedQueries } from "@/lib/db/typed-queries";
import { useAuth } from "@/contexts/AuthContext";
import { useAccountIdentity } from "@/hooks/useAccountIdentity";
import { useWalletAccounts } from "@/hooks/useWalletAccounts";
import { useUiEngine } from "@/hooks/useUiEngine";
import { useWalletBalance, useWalletTransactions, type UnifiedTx } from "@/payments/wallet-hooks";
import { createWalletAccount } from "@/lib/wallet/wallet-account";
import { useI18n, tSafe } from "@/lib/i18n";
import { getWalletDefaultCurrency, setProfileCountry } from "@/lib/wallet/wallet-config";
import { CSS } from "@/config/ui";
import { formatWalletAmount } from "@/lib/format";
import SEOHead from "@/components/SEOHead";
import ErrorBoundary from "@/components/ErrorBoundary";

import {
  ArrowLeft, Plus, ArrowUpRight, ArrowDownLeft, QrCode, Eye, EyeOff,
  CreditCard, Wallet, Shield, ScanLine, Settings, TrendingUp,
  Clock, CheckCircle, ArrowRight, Globe, Banknote, Building2,
  Brain, AlertCircle, RefreshCw, Zap,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { toast } from "sonner";
import TransactionRow, { type TransactionType } from "@/components/wallet/TransactionRow";
import WalletSecuritySettings from "@/components/wallet/WalletSecuritySettings";
import ReceiveQrPanel from "@/components/wallet/ReceiveQrPanel";
import { AnimatedCounter } from "@/components/ui/AnimatedCounter";
import WalletSkeleton from "@/components/wallet/WalletSkeleton";
import { getWalletVerticalFeatures } from "@/lib/taxonomy/wiring-helpers";
import PillarPage from "@/components/layout/PillarPage";

import NfcWalletSettings from "@/components/pwa/NfcWalletSettings";

type WalletTab = "fiat" | "qr" | "security";

const fadeSlide = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.25, ease: [0.25, 0.1, 0.25, 1] },
};

export default function WalletHubPage() {
  useUiEngine({ enabled: true, autoRun: true, observeDom: true });
  const navigate = useNavigate();
  const { user, userCountry, profileLoaded } = useAuth();
  const { displayName: accountName, accountLabel: accountTypeLabel, accountType } = useAccountIdentity();
  const { t } = useI18n();

  useEffect(() => {
    if (userCountry) setProfileCountry(userCountry);
  }, [userCountry]);
  const { rows, loading } = useWalletAccounts(user?.id);
  const { balance: walletBalance, currency: walletCurrency, loading: balanceLoading, error: walletError, reload: reloadWallet } = useWalletBalance();
  const { items: txHistory, loading: txLoading } = useWalletTransactions(100);
  const [showBalance, setShowBalance] = useState(true);
  const [filter, setFilter] = useState<"all" | "in" | "out">("all");
  const [activeTab, setActiveTab] = useState<WalletTab>("fiat");
  const mainCurrency = walletCurrency || rows[0]?.currency || getWalletDefaultCurrency();
  const totalBalance = walletBalance;

  const stats = useMemo(() => {
    const now = new Date();
    const thisMonth = txHistory.filter(tx => {
      const d = new Date(tx.created_at || "");
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const inTotal = thisMonth.filter(tx => tx.recipient_id === user?.id).reduce((s, tx) => s + Number(tx.amount || 0), 0);
    const outTotal = thisMonth.filter(tx => tx.sender_id === user?.id).reduce((s, tx) => s + Number(tx.amount || 0), 0);
    const pending = txHistory.filter(tx => tx.status === "pending").length;
    return { inTotal, outTotal, pending, txCount: thisMonth.length };
  }, [txHistory, user?.id]);

  const [counterpartyNames, setCounterpartyNames] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!txHistory.length || !user?.id) return;
    const ids = new Set<string>();
    txHistory.forEach(tx => {
      if (tx.sender_id && tx.sender_id !== user.id) ids.add(tx.sender_id);
      if (tx.recipient_id && tx.recipient_id !== user.id) ids.add(tx.recipient_id);
    });
    if (ids.size === 0) return;
    typedQueries.profiles.selectById(Array.from(ids))
      .then(({ data }) => {
        const map: Record<string, string> = {};
        (data ?? []).forEach((p) => {
          map[p.id] = p.name || [p.first_name, p.last_name].filter(Boolean).join(" ") || p.username || t("wallet.unknownUser");
        });
        setCounterpartyNames(map);
      });
  }, [txHistory, user?.id]);

  const getTxTitle = useCallback((tx: UnifiedTx) => {
    const isOut = tx.sender_id === user?.id;
    const counterpartyId = isOut ? tx.recipient_id : tx.sender_id;
    const counterpartyName = counterpartyId ? counterpartyNames[counterpartyId] : null;
    if (counterpartyName) {
      return isOut
        ? t("wallet.sentTo").replace("{name}", counterpartyName)
        : t("wallet.receivedFrom").replace("{name}", counterpartyName);
    }
    const title = tx.title;
    const ctxType = tx.context_type;
    if (title && !title.match(/^[0-9a-f]{8}-/i)) return title;
    if (ctxType === "request") return isOut ? t("wallet.paymentRequestSent") : t("wallet.paymentRequestReceived");
    if (ctxType === "top_up") return t("wallet.topUp");
    return isOut ? t("wallet.sent") : t("wallet.received");
  }, [user?.id, counterpartyNames, t]);

  const walletVerticalFeatures = useMemo(() => getWalletVerticalFeatures(), []);

  const quickActions = useMemo(() => [
    { label: t("wallet.topUpAction"), icon: Plus, gradient: "linear-gradient(135deg, hsl(152 60% 42%), hsl(160 55% 48%))" },
    { label: t("wallet.sendAction"), icon: ArrowUpRight, gradient: "linear-gradient(135deg, hsl(210 80% 52%), hsl(220 75% 58%))" },
    { label: t("wallet.requestAction"), icon: ArrowDownLeft, gradient: "linear-gradient(135deg, hsl(270 60% 55%), hsl(280 55% 60%))" },
    { label: t("wallet.scanAction"), icon: ScanLine, gradient: "linear-gradient(135deg, hsl(var(--gold)), hsl(var(--gold-light)))" },
  ], [t]);
  const quickRoutes = ["/wallet/top-up", "/wallet/transfer", "/wallet/request", "/pay/scan"];

  const filteredTx = useMemo(() => {
    const filtered = txHistory.filter((tx) => {
      if (filter === "all") return true;
      if (filter === "in") return tx.recipient_id === user?.id;
      return tx.sender_id === user?.id;
    });
    return filtered;
  }, [txHistory, filter, user?.id]);

  const walletCreateAttempted = useRef(false);
  const walletCreateRetries = useRef(0);
  const MAX_WALLET_CREATE_RETRIES = 2;
  const [walletCreateFailed, setWalletCreateFailed] = useState(false);
  const recoveryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const createDefaultWallet = useCallback(async () => {
    if (!user?.id || walletCreateAttempted.current) return;
    if (walletCreateRetries.current >= MAX_WALLET_CREATE_RETRIES) {
      setWalletCreateFailed(true);
      return;
    }
    walletCreateAttempted.current = true;
    walletCreateRetries.current += 1;
    try {
      await createWalletAccount({ ownerUserId: user.id, ownerType: "user", currency: getWalletDefaultCurrency(userCountry), accountType: "fiat" });
      toast.success(t("wallet.walletCreated"));
      setWalletCreateFailed(false);
      walletCreateRetries.current = 0;
    } catch (err: unknown) {
      walletCreateAttempted.current = false;
      const message = err instanceof Error ? err.message : "Unknown error";
      const isPermission = message.includes("RLS") || message.includes("permission") || message.includes("policy");
      console.error("[WalletHubPage] Wallet creation failed:", message);
      toast.error(isPermission
        ? tSafe(t, "wallet.walletPermissionError", "Unable to create wallet — please sign in again")
        : tSafe(t, "wallet.walletCreateError", "Unable to create wallet"));
      if (walletCreateRetries.current >= MAX_WALLET_CREATE_RETRIES) {
        setWalletCreateFailed(true);
        // Schedule one auto-recovery attempt after a back-off so transient
        // RLS / network blips don't leave the user stuck on "Setup Failed".
        if (recoveryTimerRef.current) clearTimeout(recoveryTimerRef.current);
        recoveryTimerRef.current = setTimeout(() => {
          walletCreateRetries.current = 0;
          walletCreateAttempted.current = false;
          setWalletCreateFailed(false);
          void createDefaultWallet();
        }, 8000);
      }
    }
  }, [user?.id, t, userCountry]);

  useEffect(() => {
    return () => {
      if (recoveryTimerRef.current) {
        clearTimeout(recoveryTimerRef.current);
        recoveryTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!loading && rows.length === 0 && user?.id && profileLoaded) createDefaultWallet();
  }, [loading, rows.length, user?.id, profileLoaded, createDefaultWallet]);

  const TABS: { key: WalletTab; icon: typeof Wallet; label: string }[] = [
    { key: "fiat", icon: Wallet, label: t("wallet.walletTitle") },
    { key: "qr", icon: QrCode, label: t("wallet.qrPay") },
    { key: "security", icon: Shield, label: t("wallet.security") },
  ];

  const balanceDelta = stats.inTotal - stats.outTotal;
  const deltaPositive = balanceDelta >= 0;

  return (
    <PillarPage noPadding className="flex flex-col bg-background overflow-x-clip" data-wallet-page>
      <SEOHead
        title={t("wallet.seo_title")}
        description={t("wallet.seo_desc")}
        noindex
      />
      <ErrorBoundary>
      <header className="app-page-header">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/")} className="app-page-header-btn" aria-label="Go back to home">
            <ArrowLeft />
          </button>
          <div className="flex items-center gap-2">
            <Wallet className="app-page-title-icon" />
            <h1 className="app-page-title">{t("wallet.walletTitle")}</h1>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={() => setShowBalance(v => !v)} className="app-page-header-btn" aria-label={showBalance ? "Hide balance" : "Show balance"}>
            {showBalance ? <Eye /> : <EyeOff />}
          </button>
          <button onClick={() => navigate("/settings/wallet")} className="app-page-header-btn" aria-label="Wallet settings">
            <Settings />
          </button>
        </div>
      </header>

      <div className="px-[var(--section-px)] pb-2">
        <div className="app-tab-bar" role="tablist" aria-label="Wallet sections">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                role="tab"
                aria-selected={activeTab === tab.key}
                onClick={() => setActiveTab(tab.key)}
                className="app-tab"
                data-active={activeTab === tab.key ? "true" : "false"}
              >
                <Icon />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-[var(--section-px)] pb-[var(--page-bottom-pad)] scroll-smooth">
        <AnimatePresence mode="wait">
          {activeTab === "fiat" && (
            <motion.div key="fiat" {...fadeSlide} className="flex flex-col gap-[var(--section-gap)] pt-2">

              {walletError && (
                <div className={`${CSS.appCard} p-4 flex items-center gap-3 border-destructive/15 bg-destructive/[0.04]`}>
                  <AlertCircle className="w-5 h-5 text-destructive shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[0.8125rem] font-semibold text-foreground line-clamp-1 break-words">{tSafe(t, "wallet.loadError", "Unable to load wallet")}</p>
                    <p className="text-[0.625rem] text-muted-foreground">{walletError}</p>
                  </div>
                  <button onClick={reloadWallet} className="app-page-header-btn shrink-0" aria-label="Reload wallet">
                    <RefreshCw />
                  </button>
                </div>
              )}

              <motion.div
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.05, duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
                className="relative rounded-2xl p-6 overflow-hidden"
                style={{
                  background: "linear-gradient(160deg, hsl(226 24% 11%), hsl(226 22% 15%))",
                  border: "1px solid hsl(0 0% 100% / 0.05)",
                  boxShadow: "0 4px 20px hsl(0 0% 0% / 0.25), inset 0 1px 0 hsl(0 0% 100% / 0.04)",
                }}
              >
                <div className="absolute inset-0 pointer-events-none" style={{
                  background: "radial-gradient(ellipse at 20% 20%, hsl(var(--accent) / 0.1) 0%, transparent 60%)",
                }} />

                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-bold text-white">{accountName}</p>
                    <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-accent/12">
                      <Globe className="w-3 h-3 text-accent/60" />
                      <span className="text-[0.625rem] font-bold text-accent/70">{mainCurrency}</span>
                    </div>
                  </div>
                  <p className="text-[0.625rem] font-semibold uppercase tracking-widest mb-2 text-accent/50">{tSafe(t, `wallet.accountType_${accountType}`, accountTypeLabel)} · {t("wallet.totalBalance")}</p>
                  <div className="flex items-end gap-3 mb-1 overflow-hidden">
                    <p className="text-[1.5rem] sm:text-[2rem] md:text-[2.5rem] font-extrabold tracking-tight leading-none tabular-nums text-white break-all">
                      {showBalance ? <AnimatedCounter value={totalBalance} decimals={2} duration={1000} formatter={(v) => formatWalletAmount(v, mainCurrency)} /> : "••••••"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs font-bold text-accent/50">{mainCurrency}</span>
                    {txHistory.length > 0 && (
                      <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full ${deltaPositive ? "bg-emerald-500/15" : "bg-red-500/15"}`}>
                        <TrendingUp className={`w-2.5 h-2.5 ${deltaPositive ? "text-emerald-500" : "text-red-500 rotate-180"}`} />
                        <span className={`text-[0.625rem] font-bold ${deltaPositive ? "text-emerald-500" : "text-red-500"}`}>
                          {deltaPositive ? "+" : ""}{formatWalletAmount(balanceDelta, mainCurrency)}
                        </span>
                      </div>
                    )}
                  </div>

                  {rows.length === 0 && !loading && (
                    <p className="text-xs mt-3 text-white/30">{t("wallet.noWalletYet")}</p>
                  )}
                </div>
              </motion.div>

              {txHistory.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="grid grid-cols-3 gap-2 min-w-0"
                >
                  <div className="app-stat-chip bg-emerald-600/[0.05] border-emerald-600/10">
                    <div className="app-stat-chip-label">
                      <ArrowDownLeft className="text-emerald-600" />
                      <span className="text-emerald-600">{t("wallet.income")}</span>
                    </div>
                    <p className="app-stat-chip-value">
                      {showBalance ? formatWalletAmount(stats.inTotal, mainCurrency) : "••"}
                    </p>
                  </div>
                  <div className="app-stat-chip bg-red-500/[0.04] border-red-500/10">
                    <div className="app-stat-chip-label">
                      <ArrowUpRight className="text-red-500" />
                      <span className="text-red-500">{t("wallet.spent")}</span>
                    </div>
                    <p className="app-stat-chip-value">
                      {showBalance ? formatWalletAmount(stats.outTotal, mainCurrency) : "••"}
                    </p>
                  </div>
                  <div className="app-stat-chip bg-warning/[0.05] border-warning/10">
                    <div className="app-stat-chip-label">
                      <Clock className="text-warning" />
                      <span className="text-warning">{t("wallet.pending")}</span>
                    </div>
                    <p className="app-stat-chip-value">{stats.pending}</p>
                  </div>
                </motion.div>
              )}

              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.12 }}
                className="grid grid-cols-2 sm:grid-cols-4 gap-3"
              >
                {quickActions.map((a, i) => (
                  <button
                    key={a.label}
                    onClick={() => navigate(quickRoutes[i])}
                    className="app-quick-action"
                  >
                    <div className="app-quick-action-icon" style={{ background: a.gradient }}>
                      <a.icon />
                    </div>
                    <span className="app-quick-action-label">{a.label}</span>
                  </button>
                ))}
              </motion.div>

              <motion.button
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.14 }}
                onClick={() => navigate("/wallet/forex")}
                className="w-full bg-[hsl(226_24%_11%)] border border-accent/25 rounded-[14px] p-3 px-4 flex items-center gap-3 cursor-pointer text-left"
                whileTap={{ scale: 0.98 }}
              >
                <div className="w-9 h-9 rounded-[10px] bg-accent/12 flex items-center justify-center shrink-0">
                  <TrendingUp className="w-[18px] h-[18px] text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[0.8125rem] font-bold text-foreground/90">Forex · Taux de change</div>
                  <div className="text-[0.6875rem] text-muted-foreground mt-px">EUR/USD · USD/AED · et 120+ devises</div>
                </div>
                <ArrowRight className="w-4 h-4 text-accent/60 shrink-0" />
              </motion.button>

              {txHistory.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.14 }}
                  className="app-insight-card"
                >
                  <motion.div
                    className="absolute inset-0 pointer-events-none"
                    style={{ background: "linear-gradient(90deg, transparent, hsl(var(--accent) / 0.03), transparent)" }}
                    animate={{ x: ["-100%", "100%"] }}
                    transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
                  />
                  <div className="relative z-10 flex items-start gap-3">
                    <div className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center bg-accent/10">
                      <Brain className="w-4.5 h-4.5 text-accent" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[0.625rem] font-bold uppercase tracking-wide mb-0.5 text-accent/70">{t("wallet.aiInsight")}</p>
                      <p className="text-[0.6875rem] text-foreground/70 leading-relaxed">
                        {stats.outTotal > stats.inTotal
                          ? t("wallet.spentMoreTip")
                              .replace("{pct}", ((stats.outTotal - stats.inTotal) / (stats.inTotal || 1) * 100).toFixed(0))
                          : stats.txCount > 0
                          ? t("wallet.inGreenTip")
                              .replace("{amount}", formatWalletAmount(stats.inTotal - stats.outTotal, mainCurrency))
                              .replace("{currency}", mainCurrency)
                              .replace("{count}", String(stats.txCount))
                          : t("wallet.startUsingTip")
                        }
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}

              {rows.length > 0 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.18 }}>
                  <div className="page-section__header mb-[var(--section-header-mb)]">
                    <p className="app-section-label">{t("wallet.accounts")}</p>
                    <button onClick={() => navigate("/wallet/accounts")} className="app-section-link">
                      {t("wallet.manage")} <ArrowRight />
                    </button>
                  </div>
                  <div className="space-y-2">
                    {rows.map((acc: Record<string, unknown>) => {
                      const accCurrency = (acc.currency as string) || getWalletDefaultCurrency();
                      const accBalance = Number(acc.balance || 0);
                      const ownerType = (acc.owner_type as string) || "user";
                      const isBusiness = ownerType === "workspace" || ownerType === "merchant";
                      const accountLabel = isBusiness
                        ? `${accountName} · ${tSafe(t, "wallet.business", "Business")}`
                        : `${accountName} · ${tSafe(t, "wallet.personal", "Personal")}`;
                      let formattedBalance = "••••";
                      if (showBalance) {
                          try { formattedBalance = formatWalletAmount(accBalance, accCurrency); }
                        catch { formattedBalance = `${accBalance.toFixed(2)} ${accCurrency}`; }
                      }
                      return (
                        <div key={acc.id as string} className={`${CSS.appCard} flex items-center gap-3 p-4`}>
                          <div className={`app-list-row-icon ${isBusiness ? "bg-accent/[0.08]" : "bg-[hsl(225_22%_16%/0.06)]"}`}>
                            {isBusiness ? <Building2 className="text-accent" /> : <Wallet className="text-[hsl(225,22%,16%)]" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-foreground">{accountLabel}</p>
                            <p className="text-[0.625rem] text-muted-foreground flex items-center gap-1">
                              <CheckCircle className="w-2.5 h-2.5 text-success" />
                              {t("wallet.active")} · {accCurrency}
                            </p>
                          </div>
                          <span className="text-sm font-bold text-foreground tabular-nums whitespace-nowrap">{formattedBalance}</span>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {rows.length === 0 && !loading && (
                <div className={`${CSS.appCard} p-8 flex flex-col items-center gap-3 text-center`}>
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${walletCreateFailed ? "bg-red-500/[0.08]" : "bg-accent/[0.08]"}`}>
                    {walletCreateFailed
                      ? <AlertCircle className="w-8 h-8 text-red-500/60" />
                      : <Wallet className="w-8 h-8 text-accent/50" />}
                  </div>
                  <p className="text-sm font-bold text-foreground">
                    {walletCreateFailed
                      ? tSafe(t, "wallet.walletSetupFailed", "Wallet setup failed")
                      : t("wallet.noWalletYet")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {walletCreateFailed
                      ? tSafe(t, "wallet.walletSetupFailedDesc", "We couldn't create your wallet automatically. Please try again or sign in again.")
                      : t("wallet.createWalletDesc")}
                  </p>
                  <button
                    onClick={() => {
                      walletCreateRetries.current = 0;
                      walletCreateAttempted.current = false;
                      setWalletCreateFailed(false);
                      createDefaultWallet();
                    }}
                    className="mt-2 px-6 py-2.5 rounded-xl text-xs font-bold active:scale-95 transition-transform flex items-center gap-2 bg-accent text-[hsl(225,22%,16%)]"
                  >
                    {walletCreateFailed && <RefreshCw className="w-3.5 h-3.5" />}
                    {walletCreateFailed
                      ? tSafe(t, "wallet.tryAgain", "Try Again")
                      : t("wallet.createWallet")}
                  </button>
                </div>
              )}

              {(loading || balanceLoading) && rows.length === 0 && (
                <WalletSkeleton />
              )}

              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.22 }}>
                <div className="page-section__header mb-[var(--section-header-mb)]">
                  <p className="app-section-label">{t("wallet.recentActivity")}</p>
                  <div className="app-filter-bar">
                    {(["all", "in", "out"] as const).map(f => (
                      <button
                        key={f}
                        onClick={() => setFilter(f)}
                        aria-pressed={filter === f}
                        className="app-filter-btn"
                        data-active={filter === f ? "true" : "false"}
                      >
                        {f === "all" ? t("wallet.all") : f === "in" ? t("wallet.in") : t("wallet.out")}
                      </button>
                    ))}
                  </div>
                </div>

                {filteredTx.length === 0 ? (
                  <div className={`${CSS.appCard} p-8 flex flex-col items-center gap-2 text-center`}>
                    <CreditCard className="w-8 h-8 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">{txLoading ? t("wallet.loading") : t("wallet.noTransactions")}</p>
                  </div>
                ) : (
                  <VirtualizedTransactionList
                    transactions={filteredTx}
                    userId={user?.id}
                    getTxTitle={getTxTitle}
                  />
                )}
              </motion.div>
            </motion.div>
          )}

          {activeTab === "qr" && (
            <motion.div key="qr" {...fadeSlide}>
              <ReceiveQrPanel />
            </motion.div>
          )}

          {activeTab === "security" && (
            <motion.div key="security" {...fadeSlide}>
              <WalletSecuritySettings />
              <div className="mt-4">
                <NfcWalletSettings />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <motion.button
        type="button"
        onClick={() => navigate("/pay/scan")}
        className="fixed z-30 flex items-center gap-2 shadow-lg active:scale-95 transition-transform bg-accent text-accent-foreground rounded-[28px] py-[14px] px-5 shadow-[0_6px_24px_hsl(var(--accent)/0.35)] bottom-[88px] right-5"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.3, type: "spring", stiffness: 400, damping: 20 }}
      >
        <Zap className="w-5 h-5" />
        <span className="text-sm font-bold">{tSafe(t, "wallet.quickPay", "Quick Pay")}</span>
      </motion.button>
      </ErrorBoundary>
    </PillarPage>
  );
}

function VirtualizedTransactionList({
  transactions,
  userId,
  getTxTitle,
}: {
  transactions: UnifiedTx[];
  userId?: string;
  getTxTitle: (tx: UnifiedTx) => string;
}) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: transactions.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 64,
    overscan: 10,
    getItemKey: (index) => transactions[index]?.id ?? index,
  });

  return (
    <div
      ref={parentRef}
      className="app-card rounded-xl overflow-auto border border-border/8 bg-card"
      style={{ maxHeight: "min(60vh, 600px)", contain: "layout" }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const tx = transactions[virtualRow.index];
          return (
            <div
              key={virtualRow.key}
              data-index={virtualRow.index}
              ref={virtualizer.measureElement}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <TransactionRow
                id={tx.id}
                title={getTxTitle(tx)}
                amount={Number(tx.amount ?? 0)}
                currency={tx.currency ?? getWalletDefaultCurrency()}
                type={(tx.context_type as TransactionType) ?? "payment"}
                direction={tx.sender_id === userId ? "out" : "in"}
                status={tx.status === "completed" ? "completed" : tx.status === "pending" ? "pending" : tx.status === "failed" ? "failed" : "completed"}
                timestamp={tx.created_at}
              />
              {virtualRow.index < transactions.length - 1 && <div className="app-list-divider" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

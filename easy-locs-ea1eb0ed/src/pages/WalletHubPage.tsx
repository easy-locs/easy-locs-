import { useNavigate } from "react-router-dom";
import { typedQueries } from "@/lib/db/typed-queries";
import { useAuth } from "@/contexts/AuthContext";
import { useAccountIdentity } from "@/hooks/useAccountIdentity";
import { useWalletAccounts } from "@/hooks/useWalletAccounts";
import { useUiEngine } from "@/hooks/useUiEngine";
import { useWalletBalance, useWalletTransactions } from "@/payments/wallet-hooks";
import { createWalletAccount } from "@/lib/wallet/wallet-account";
import { useI18n, tSafe } from "@/lib/i18n";
import { getWalletDefaultCurrency } from "@/lib/wallet/wallet-config";
import SEOHead from "@/components/SEOHead";

import {
  ArrowLeft, Plus, ArrowUpRight, ArrowDownLeft, QrCode, Eye, EyeOff,
  CreditCard, Wallet, Shield, ScanLine, Settings, TrendingUp,
  Clock, CheckCircle, ArrowRight, Globe, Banknote, Building2,
  Brain, AlertCircle, RefreshCw, Zap,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { toast } from "sonner";
import TransactionRow, { type TransactionType } from "@/components/wallet/TransactionRow";
import WalletSecuritySettings from "@/components/wallet/WalletSecuritySettings";
import ReceiveQrPanel from "@/components/wallet/ReceiveQrPanel";
import { AnimatedCounter } from "@/components/ui/AnimatedCounter";
import WalletSkeleton from "@/components/wallet/WalletSkeleton";
import { getWalletVerticalFeatures } from "@/lib/taxonomy/wiring-helpers";

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
  const { user } = useAuth();
  const { displayName: accountName, accountLabel: accountTypeLabel, accountType } = useAccountIdentity();
  const { t } = useI18n();
  const { rows, loading } = useWalletAccounts(user?.id);
  const { balance: walletBalance, currency: walletCurrency, loading: balanceLoading, error: walletError, reload: reloadWallet } = useWalletBalance();
  const { items: txHistory, loading: txLoading } = useWalletTransactions(100);
  const [showBalance, setShowBalance] = useState(true);
  const [filter, setFilter] = useState<"all" | "in" | "out">("all");
  const [activeTab, setActiveTab] = useState<WalletTab>("fiat");
  const [txPage, setTxPage] = useState(1);
  const TX_PER_PAGE = 20;

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

  const getTxTitle = useCallback((tx: Record<string, unknown>) => {
    const isOut = tx.sender_id === user?.id;
    const counterpartyId = (isOut ? tx.recipient_id : tx.sender_id) as string | undefined;
    const counterpartyName = counterpartyId ? counterpartyNames[counterpartyId] : null;
    if (counterpartyName) {
      return isOut
        ? t("wallet.sentTo").replace("{name}", counterpartyName)
        : t("wallet.receivedFrom").replace("{name}", counterpartyName);
    }
    const title = tx.title as string | undefined;
    const ctxType = tx.context_type as string | undefined;
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

  const paginatedTx = useMemo(() => filteredTx.slice(0, txPage * TX_PER_PAGE), [filteredTx, txPage]);
  const hasMoreTx = paginatedTx.length < filteredTx.length;

  const walletCreateAttempted = useRef(false);
  const walletCreateRetries = useRef(0);
  const MAX_WALLET_CREATE_RETRIES = 2;
  const [walletCreateFailed, setWalletCreateFailed] = useState(false);
  const createDefaultWallet = useCallback(async () => {
    if (!user?.id || walletCreateAttempted.current) return;
    if (walletCreateRetries.current >= MAX_WALLET_CREATE_RETRIES) {
      setWalletCreateFailed(true);
      return;
    }
    walletCreateAttempted.current = true;
    walletCreateRetries.current += 1;
    try {
      await createWalletAccount({ ownerUserId: user.id, ownerType: "user", currency: getWalletDefaultCurrency(), accountType: "fiat" });
      toast.success(t("wallet.walletCreated"));
      setWalletCreateFailed(false);
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
      }
    }
  }, [user?.id, t]);

  useEffect(() => {
    if (!loading && rows.length === 0 && user?.id) createDefaultWallet();
  }, [loading, rows.length, user?.id, createDefaultWallet]);

  const TABS: { key: WalletTab; icon: typeof Wallet; label: string }[] = [
    { key: "fiat", icon: Wallet, label: t("wallet.walletTitle") },
    { key: "qr", icon: QrCode, label: t("wallet.qrPay") },
    { key: "security", icon: Shield, label: t("wallet.security") },
  ];

  const balanceDelta = stats.inTotal - stats.outTotal;
  const deltaPositive = balanceDelta >= 0;

  return (
    <div className="app-mobile-page pillar-page flex flex-col bg-background min-h-[100dvh]" data-wallet-page>
      <SEOHead
        title={t("wallet.seo_title")}
        description={t("wallet.seo_desc")}
        noindex
      />
      <header className="app-page-header">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/")} className="app-page-header-btn">
            <ArrowLeft />
          </button>
          <div className="flex items-center gap-2">
            <Wallet className="app-page-title-icon" />
            <h1 className="app-page-title">{t("wallet.walletTitle")}</h1>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={() => setShowBalance(v => !v)} className="app-page-header-btn">
            {showBalance ? <Eye /> : <EyeOff />}
          </button>
          <button onClick={() => navigate("/settings/wallet")} className="app-page-header-btn">
            <Settings />
          </button>
        </div>
      </header>

      <div className="px-4 pb-2">
        <div className="app-tab-bar">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
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

      <div className="flex-1 overflow-y-auto px-4 pb-24" style={{ scrollBehavior: "smooth" }}>
        <AnimatePresence mode="wait">
          {activeTab === "fiat" && (
            <motion.div key="fiat" {...fadeSlide} style={{ display: "flex", flexDirection: "column", gap: "var(--section-gap)" }}>

              {walletError && (
                <div className="app-card p-4 flex items-center gap-3" style={{ borderColor: "hsl(var(--destructive) / 0.15)", background: "hsl(var(--destructive) / 0.04)" }}>
                  <AlertCircle className="w-5 h-5 text-destructive shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-foreground line-clamp-1 break-words">{tSafe(t, "wallet.loadError", "Unable to load wallet")}</p>
                    <p className="text-[10px] text-muted-foreground">{walletError}</p>
                  </div>
                  <button onClick={reloadWallet} className="app-page-header-btn shrink-0">
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
                  background: "linear-gradient(160deg, hsl(225 22% 12%), hsl(225 22% 15%))",
                }}
              >
                <div className="absolute inset-0 pointer-events-none" style={{
                  background: "radial-gradient(ellipse at 20% 20%, hsl(var(--accent) / 0.1) 0%, transparent 60%)",
                }} />

                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-bold" style={{ color: "hsl(0 0% 100%)" }}>{accountName}</p>
                    <div className="flex items-center gap-1 px-2.5 py-1 rounded-full" style={{ background: "hsl(var(--accent) / 0.12)" }}>
                      <Globe className="w-3 h-3" style={{ color: "hsl(var(--accent) / 0.6)" }} />
                      <span className="text-[10px] font-bold" style={{ color: "hsl(var(--accent) / 0.7)" }}>{mainCurrency}</span>
                    </div>
                  </div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: "hsl(var(--accent) / 0.5)" }}>{accountTypeLabel} · {t("wallet.totalBalance")}</p>
                  <div className="flex items-end gap-3 mb-1">
                    <p className="text-[2.5rem] font-extrabold tracking-tight leading-none tabular-nums" style={{ color: "hsl(0 0% 100%)" }}>
                      {showBalance ? <AnimatedCounter value={totalBalance} decimals={2} duration={1000} /> : "••••••"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs font-bold" style={{ color: "hsl(var(--accent) / 0.5)" }}>{mainCurrency}</span>
                    {txHistory.length > 0 && (
                      <div className="flex items-center gap-1 px-2 py-0.5 rounded-full" style={{
                        background: deltaPositive ? "hsl(152 70% 45% / 0.15)" : "hsl(0 70% 55% / 0.15)",
                      }}>
                        <TrendingUp className="w-2.5 h-2.5" style={{
                          color: deltaPositive ? "hsl(152 70% 50%)" : "hsl(0 70% 60%)",
                          transform: deltaPositive ? "none" : "rotate(180deg)",
                        }} />
                        <span className="text-[10px] font-bold" style={{
                          color: deltaPositive ? "hsl(152 70% 50%)" : "hsl(0 70% 60%)",
                        }}>
                          {deltaPositive ? "+" : ""}{balanceDelta.toFixed(0)} {mainCurrency}
                        </span>
                      </div>
                    )}
                  </div>

                  {rows.length === 0 && !loading && (
                    <p className="text-xs mt-3" style={{ color: "hsl(0 0% 100% / 0.3)" }}>{t("wallet.noWalletYet")}</p>
                  )}
                </div>
              </motion.div>

              {txHistory.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="grid grid-cols-3 gap-2"
                >
                  <div className="app-stat-chip" style={{ background: "hsl(152 60% 42% / 0.05)", borderColor: "hsl(152 60% 42% / 0.1)" }}>
                    <div className="app-stat-chip-label">
                      <ArrowDownLeft style={{ color: "hsl(152 60% 42%)" }} />
                      <span style={{ color: "hsl(152 60% 42%)" }}>{t("wallet.income")}</span>
                    </div>
                    <p className="app-stat-chip-value">
                      {showBalance ? stats.inTotal.toFixed(0) : "••"} <span className="text-[10px] text-muted-foreground">{mainCurrency}</span>
                    </p>
                  </div>
                  <div className="app-stat-chip" style={{ background: "hsl(0 70% 55% / 0.04)", borderColor: "hsl(0 70% 55% / 0.1)" }}>
                    <div className="app-stat-chip-label">
                      <ArrowUpRight style={{ color: "hsl(0 65% 55%)" }} />
                      <span style={{ color: "hsl(0 65% 55%)" }}>{t("wallet.spent")}</span>
                    </div>
                    <p className="app-stat-chip-value">
                      {showBalance ? stats.outTotal.toFixed(0) : "••"} <span className="text-[10px] text-muted-foreground">{mainCurrency}</span>
                    </p>
                  </div>
                  <div className="app-stat-chip" style={{ background: "hsl(var(--warning) / 0.05)", borderColor: "hsl(var(--warning) / 0.1)" }}>
                    <div className="app-stat-chip-label">
                      <Clock style={{ color: "hsl(var(--warning))" }} />
                      <span style={{ color: "hsl(var(--warning))" }}>{t("wallet.pending")}</span>
                    </div>
                    <p className="app-stat-chip-value">{stats.pending}</p>
                  </div>
                </motion.div>
              )}

              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.12 }}
                className="grid grid-cols-4 gap-3"
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
                style={{
                  width: "100%",
                  background: "hsl(220 35% 13%)",
                  border: "1px solid hsl(var(--accent) / 0.25)",
                  borderRadius: 14,
                  padding: "12px 16px",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  cursor: "pointer",
                  textAlign: "left",
                }}
                whileTap={{ scale: 0.98 }}
              >
                <div style={{ width: 36, height: 36, borderRadius: 10, background: "hsl(var(--accent) / 0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <TrendingUp style={{ width: 18, height: 18, color: "hsl(var(--accent))" }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "hsl(220 10% 92%)" }}>Forex · Taux de change</div>
                  <div style={{ fontSize: 11, color: "hsl(220 20% 55%)", marginTop: 1 }}>EUR/USD · USD/AED · et 120+ devises</div>
                </div>
                <ArrowRight style={{ width: 16, height: 16, color: "hsl(var(--accent) / 0.6)", flexShrink: 0 }} />
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
                    <div className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "hsl(var(--accent) / 0.1)" }}>
                      <Brain className="w-4.5 h-4.5" style={{ color: "hsl(var(--accent))" }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-wide mb-0.5" style={{ color: "hsl(var(--accent) / 0.7)" }}>{t("wallet.aiInsight")}</p>
                      <p className="text-[11px] text-foreground/70 leading-relaxed">
                        {stats.outTotal > stats.inTotal
                          ? t("wallet.spentMoreTip")
                              .replace("{pct}", ((stats.outTotal - stats.inTotal) / (stats.inTotal || 1) * 100).toFixed(0))
                          : stats.txCount > 0
                          ? t("wallet.inGreenTip")
                              .replace("{amount}", (stats.inTotal - stats.outTotal).toFixed(0))
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
                  <div className="page-section__header" style={{ marginBottom: "var(--section-header-mb)" }}>
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
                        try { formattedBalance = new Intl.NumberFormat(undefined, { style: "currency", currency: accCurrency, minimumFractionDigits: 2 }).format(accBalance); }
                        catch { formattedBalance = `${accBalance.toFixed(2)} ${accCurrency}`; }
                      }
                      return (
                        <div key={acc.id as string} className="app-card flex items-center gap-3 p-4">
                          <div className="app-list-row-icon" style={{ background: isBusiness ? "hsl(var(--accent) / 0.08)" : "hsl(225 22% 16% / 0.06)" }}>
                            {isBusiness ? <Building2 style={{ color: "hsl(var(--accent))" }} /> : <Wallet style={{ color: "hsl(225 22% 16%)" }} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-foreground">{accountLabel}</p>
                            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
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
                <div className="app-card p-8 flex flex-col items-center gap-3 text-center">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: walletCreateFailed ? "hsl(0 70% 55% / 0.08)" : "hsl(var(--accent) / 0.08)" }}>
                    {walletCreateFailed
                      ? <AlertCircle className="w-8 h-8" style={{ color: "hsl(0 70% 55% / 0.6)" }} />
                      : <Wallet className="w-8 h-8" style={{ color: "hsl(var(--accent) / 0.5)" }} />}
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
                    className="mt-2 px-6 py-2.5 rounded-xl text-xs font-bold active:scale-95 transition-transform flex items-center gap-2"
                    style={{ background: "hsl(var(--accent))", color: "hsl(225 22% 16%)" }}
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
                <div className="page-section__header" style={{ marginBottom: "var(--section-header-mb)" }}>
                  <p className="app-section-label">{t("wallet.recentActivity")}</p>
                  <div className="app-filter-bar">
                    {(["all", "in", "out"] as const).map(f => (
                      <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className="app-filter-btn"
                        data-active={filter === f ? "true" : "false"}
                      >
                        {f === "all" ? t("wallet.all") : f === "in" ? t("wallet.in") : t("wallet.out")}
                      </button>
                    ))}
                  </div>
                </div>

                {filteredTx.length === 0 ? (
                  <div className="app-card p-8 flex flex-col items-center gap-2 text-center">
                    <CreditCard className="w-8 h-8 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">{txLoading ? t("wallet.loading") : t("wallet.noTransactions")}</p>
                  </div>
                ) : (
                  <div className="app-card">
                    {paginatedTx.map((tx, i) => (
                      <div key={tx.id ?? i}>
                        <TransactionRow
                          id={tx.id}
                          title={getTxTitle(tx)}
                          amount={Number(tx.amount ?? 0)}
                          currency={tx.currency ?? getWalletDefaultCurrency()}
                          type={(tx.context_type as TransactionType) ?? "payment"}
                          direction={tx.sender_id === user?.id ? "out" : "in"}
                          status={tx.status === "completed" ? "completed" : tx.status === "pending" ? "pending" : tx.status === "failed" ? "failed" : "completed"}
                          timestamp={tx.created_at}
                        />
                        {i < paginatedTx.length - 1 && <div className="app-list-divider" />}
                      </div>
                    ))}
                    {hasMoreTx && (
                      <button
                        onClick={() => setTxPage(p => p + 1)}
                        className="w-full py-3 text-center text-xs font-bold active:opacity-70 transition-opacity"
                        style={{ color: "hsl(var(--accent))" }}
                      >
                        {tSafe(t, "wallet.loadMore", "Load more")} ({filteredTx.length - paginatedTx.length} {tSafe(t, "wallet.remaining", "remaining")})
                      </button>
                    )}
                  </div>
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
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <motion.button
        type="button"
        onClick={() => navigate("/pay/scan")}
        className="fixed z-30 flex items-center gap-2 shadow-lg active:scale-95 transition-transform"
        style={{
          bottom: 88,
          right: 20,
          background: "hsl(var(--accent))",
          color: "hsl(225 22% 16%)",
          borderRadius: 28,
          padding: "14px 20px",
          boxShadow: "0 6px 24px hsl(var(--accent) / 0.35)",
        }}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.3, type: "spring", stiffness: 400, damping: 20 }}
      >
        <Zap className="w-5 h-5" />
        <span className="text-sm font-bold">{tSafe(t, "wallet.quickPay", "Quick Pay")}</span>
      </motion.button>
    </div>
  );
}

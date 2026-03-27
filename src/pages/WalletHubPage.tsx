/**
 * WalletHubPage — Premium Wallet with glassmorphic cards, detailed analytics, and rich UX.
 * Single authoritative wallet page. Route: /wallet/hub + /wallet
 */
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useWalletAccounts } from "@/hooks/useWalletAccounts";
import { useWalletTransactions } from "@/payments/wallet-hooks";
import { createWalletAccount } from "@/lib/wallet/wallet-account";

import {
  ArrowLeft, Plus, ArrowUpRight, ArrowDownLeft, QrCode, Eye, EyeOff,
  CreditCard, Wallet, Shield, ScanLine, Settings, TrendingUp, Sparkles,
  Clock, CheckCircle, AlertCircle, ArrowRight, Globe, Banknote,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useMemo, useCallback } from "react";
import { toast } from "sonner";
import TransactionRow, { type TransactionType } from "@/components/wallet/TransactionRow";
import WalletSecurityPanel from "@/components/wallet/WalletSecurityPanel";
import ReceiveQrPanel from "@/components/wallet/ReceiveQrPanel";
import { AnimatedCounter } from "@/components/ui/AnimatedCounter";

type WalletTab = "fiat" | "qr" | "security";

export default function WalletHubPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { rows, loading } = useWalletAccounts(user?.id);
  const { items: txHistory, loading: txLoading } = useWalletTransactions(100);
  const [showBalance, setShowBalance] = useState(true);
  const [filter, setFilter] = useState<"all" | "in" | "out">("all");
  const [activeTab, setActiveTab] = useState<WalletTab>("fiat");

  const mainCurrency = rows[0]?.currency || "AED";
  
  // Dynamic total balance: sum wallet_accounts balances, cross-check with tx flow
  const totalBalance = useMemo(() => {
    const accountBalance = rows.reduce((sum: number, r: any) => sum + (r.balance || 0), 0);
    // If account balance is 0 but we have completed transactions, compute from tx
    if (accountBalance === 0 && txHistory.length > 0) {
      const inFlow = txHistory.filter(tx => tx.recipient_id === user?.id && tx.status === "completed").reduce((s, tx) => s + Number(tx.amount || 0), 0);
      const outFlow = txHistory.filter(tx => tx.sender_id === user?.id && tx.status === "completed").reduce((s, tx) => s + Number(tx.amount || 0), 0);
      return inFlow - outFlow;
    }
    return accountBalance;
  }, [rows, txHistory, user?.id]);

  // Analytics
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

  // Resolve counterparty names for transactions
  const [counterpartyNames, setCounterpartyNames] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!txHistory.length || !user?.id) return;
    const ids = new Set<string>();
    txHistory.forEach(tx => {
      if (tx.sender_id && tx.sender_id !== user.id) ids.add(tx.sender_id);
      if (tx.recipient_id && tx.recipient_id !== user.id) ids.add(tx.recipient_id);
    });
    if (ids.size === 0) return;
    (supabase as any)
      .from("profiles")
      .select("id, name, first_name, last_name, username")
      .in("id", Array.from(ids))
      .then(({ data }: any) => {
        const map: Record<string, string> = {};
        (data ?? []).forEach((p: any) => {
          map[p.id] = p.name || [p.first_name, p.last_name].filter(Boolean).join(" ") || p.username || "User";
        });
        setCounterpartyNames(map);
      });
  }, [txHistory, user?.id]);

  const getTxTitle = useCallback((tx: any) => {
    const isOut = tx.sender_id === user?.id;
    const counterpartyId = isOut ? tx.recipient_id : tx.sender_id;
    const counterpartyName = counterpartyId ? counterpartyNames[counterpartyId] : null;
    if (counterpartyName) {
      return isOut ? `Sent to ${counterpartyName}` : `Received from ${counterpartyName}`;
    }
    return tx.title || tx.context_type || "Transaction";
  }, [user?.id, counterpartyNames]);

  const quickActions = [
    { label: "Top up", icon: Plus, color: "from-emerald-500 to-emerald-600" },
    { label: "Send", icon: ArrowUpRight, color: "from-blue-500 to-blue-600" },
    { label: "Request", icon: ArrowDownLeft, color: "from-violet-500 to-violet-600" },
    { label: "Scan", icon: ScanLine, color: "from-amber-500 to-amber-600" },
  ];
  const quickRoutes = ["/wallet/top-up", "/wallet/transfer", "/wallet/request", "/pay/scan"];

  const filteredTx = txHistory.filter((tx) => {
    if (filter === "all") return true;
    if (filter === "in") return tx.recipient_id === user?.id;
    return tx.sender_id === user?.id;
  });

  const createDefaultWallet = async () => {
    if (!user?.id) return;
    try {
      await createWalletAccount({ ownerUserId: user.id, ownerType: "user", currency: "AED", accountType: "fiat" });
      toast.success("Wallet created");
    } catch {
      toast.error("Could not create wallet");
    }
  };

  useEffect(() => {
    if (!loading && rows.length === 0 && user?.id) createDefaultWallet();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, rows.length, user?.id]);

  const TABS: { key: WalletTab; icon: typeof Wallet; label: string }[] = [
    { key: "fiat", icon: Wallet, label: "Wallet" },
    { key: "qr", icon: QrCode, label: "QR Pay" },
    { key: "security", icon: Shield, label: "Security" },
  ];

  return (
    <div className="app-mobile-page flex flex-col bg-background" data-wallet-page>
      {/* Header */}
      <header className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/")} className="w-9 h-9 rounded-xl flex items-center justify-center active:scale-95 transition-transform bg-muted/60 backdrop-blur-sm">
            <ArrowLeft className="w-4.5 h-4.5" />
          </button>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <h1 className="text-lg font-black text-foreground tracking-tight">Wallet Pro</h1>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setShowBalance(v => !v)} className="w-9 h-9 rounded-xl flex items-center justify-center bg-muted/60 backdrop-blur-sm active:scale-95 transition-transform">
            {showBalance ? <Eye className="w-4 h-4 text-muted-foreground" /> : <EyeOff className="w-4 h-4 text-muted-foreground" />}
          </button>
          <button onClick={() => navigate("/settings/payment-methods")} className="w-9 h-9 rounded-xl flex items-center justify-center bg-muted/60 backdrop-blur-sm active:scale-95 transition-transform">
            <Settings className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </header>

      {/* Tab bar */}
      <div className="px-4 pb-2">
        <div className="flex gap-1 p-1 rounded-2xl bg-muted/40 backdrop-blur-sm">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[11px] font-bold transition-all active:scale-[0.97]"
                style={{
                  background: isActive ? "hsl(var(--card))" : "transparent",
                  color: isActive ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))",
                  boxShadow: isActive ? "0 2px 12px hsl(var(--primary) / 0.1)" : "none",
                }}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 pb-24">
        <AnimatePresence mode="wait">
          {activeTab === "fiat" && (
            <motion.div key="fiat" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }} className="space-y-5">

              {/* ── Hero Balance Card ── */}
              <motion.div
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.05 }}
                className="relative rounded-3xl p-6 overflow-hidden"
                style={{ background: "linear-gradient(145deg, hsl(var(--primary)), hsl(var(--primary) / 0.7))" }}
              >
                <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full opacity-20" style={{ background: "radial-gradient(circle, hsl(var(--primary-foreground) / 0.3), transparent)" }} />
                <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full opacity-10" style={{ background: "radial-gradient(circle, hsl(var(--primary-foreground) / 0.4), transparent)" }} />

                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-medium text-primary-foreground/60 uppercase tracking-wider">Total Balance</p>
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary-foreground/10">
                      <Globe className="w-3 h-3 text-primary-foreground/50" />
                      <span className="text-[10px] font-bold text-primary-foreground/50">{mainCurrency}</span>
                    </div>
                  </div>
                  <p className="text-4xl font-black text-primary-foreground tracking-tight">
                    {showBalance ? <AnimatedCounter value={totalBalance} decimals={2} duration={1000} /> : "••••••"}
                  </p>
                  <p className="text-sm font-semibold text-primary-foreground/50 mt-0.5">{mainCurrency}</p>

                  {rows.length === 0 && !loading && (
                    <p className="text-xs text-primary-foreground/40 mt-3">No wallet yet</p>
                  )}
                </div>
              </motion.div>

              {/* ── Monthly Summary ── */}
              {txHistory.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-3 gap-2">
                  <div className="rounded-2xl p-3 bg-emerald-500/5 border border-emerald-500/10">
                    <div className="flex items-center gap-1 mb-1">
                      <ArrowDownLeft className="w-3 h-3 text-emerald-500" />
                      <span className="text-[9px] font-bold text-emerald-500/70 uppercase">Income</span>
                    </div>
                    <p className="text-sm font-black text-foreground tabular-nums">
                      {showBalance ? stats.inTotal.toFixed(0) : "••"} <span className="text-[9px] text-muted-foreground">{mainCurrency}</span>
                    </p>
                  </div>
                  <div className="rounded-2xl p-3 bg-red-500/5 border border-red-500/10">
                    <div className="flex items-center gap-1 mb-1">
                      <ArrowUpRight className="w-3 h-3 text-red-400" />
                      <span className="text-[9px] font-bold text-red-400/70 uppercase">Spent</span>
                    </div>
                    <p className="text-sm font-black text-foreground tabular-nums">
                      {showBalance ? stats.outTotal.toFixed(0) : "••"} <span className="text-[9px] text-muted-foreground">{mainCurrency}</span>
                    </p>
                  </div>
                  <div className="rounded-2xl p-3 bg-amber-500/5 border border-amber-500/10">
                    <div className="flex items-center gap-1 mb-1">
                      <Clock className="w-3 h-3 text-amber-500" />
                      <span className="text-[9px] font-bold text-amber-500/70 uppercase">Pending</span>
                    </div>
                    <p className="text-sm font-black text-foreground tabular-nums">
                      {stats.pending}
                    </p>
                  </div>
                </motion.div>
              )}

              {/* ── Quick Actions Grid ── */}
              <div className="grid grid-cols-4 gap-3">
                {quickActions.map((a, i) => (
                  <motion.button
                    key={a.label}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.12 + i * 0.04 }}
                    onClick={() => navigate(quickRoutes[i])}
                    className="flex flex-col items-center gap-2 active:scale-90 transition-transform"
                  >
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center bg-gradient-to-br ${a.color} shadow-lg`}>
                      <a.icon className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-[10px] font-bold text-muted-foreground">{a.label}</span>
                  </motion.button>
                ))}
              </div>

              {/* ── Accounts ── */}
              {rows.length > 0 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Accounts</p>
                    <button onClick={() => navigate("/wallet/accounts")} className="text-[10px] font-bold text-primary flex items-center gap-0.5">
                      Manage <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="space-y-2">
                    {rows.map((acc: any) => (
                      <div key={acc.id} className="flex items-center gap-3 rounded-2xl p-4 bg-card/80 backdrop-blur-sm border border-border/10">
                        <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: "hsl(var(--primary) / 0.08)" }}>
                          {acc.account_type === "fiat" ? <Banknote className="w-5 h-5 text-primary" /> : <Wallet className="w-5 h-5 text-primary" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-foreground capitalize">{acc.account_type || "Main"}</p>
                          <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <CheckCircle className="w-2.5 h-2.5 text-emerald-500" />
                            Active · {acc.currency}
                          </p>
                        </div>
                        <span className="text-sm font-black text-foreground tabular-nums">
                          {showBalance ? `${(acc.balance || 0).toFixed(2)}` : "••••"}
                        </span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* No wallet state */}
              {rows.length === 0 && !loading && (
                <div className="rounded-3xl p-8 flex flex-col items-center gap-3 text-center bg-card/60 backdrop-blur-sm border border-border/10">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-muted/50">
                    <Wallet className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-bold text-foreground">No wallet yet</p>
                  <p className="text-xs text-muted-foreground">Create a wallet to start transacting</p>
                  <button onClick={createDefaultWallet} className="mt-2 px-6 py-2.5 rounded-xl text-xs font-bold bg-primary text-primary-foreground active:scale-95 transition-transform">
                    Create Wallet
                  </button>
                </div>
              )}

              {loading && (
                <div className="flex flex-col items-center gap-3 py-8">
                  <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                  <p className="text-xs text-muted-foreground">Loading wallet...</p>
                </div>
              )}

              {/* ── Transaction History ── */}
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Recent Activity</p>
                  <div className="flex gap-0.5 p-0.5 rounded-lg bg-muted/40">
                    {(["all", "in", "out"] as const).map(f => (
                      <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className="px-3 py-1.5 rounded-md text-[10px] font-bold transition-all active:scale-95"
                        style={{
                          background: filter === f ? "hsl(var(--card))" : "transparent",
                          color: filter === f ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))",
                          boxShadow: filter === f ? "0 1px 4px hsl(var(--primary) / 0.08)" : "none",
                        }}
                      >
                        {f === "all" ? "All" : f === "in" ? "In" : "Out"}
                      </button>
                    ))}
                  </div>
                </div>

                {filteredTx.length === 0 ? (
                  <div className="rounded-2xl p-8 flex flex-col items-center gap-2 text-center bg-card/60 backdrop-blur-sm border border-border/10">
                    <CreditCard className="w-8 h-8 text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground">{txLoading ? "Loading..." : "No transactions yet"}</p>
                  </div>
                ) : (
                  <div className="rounded-2xl overflow-hidden bg-card/80 backdrop-blur-sm border border-border/10">
                     {filteredTx.map((tx, i) => (
                       <div key={tx.id ?? i}>
                         <TransactionRow
                           title={getTxTitle(tx)}
                           amount={Number(tx.amount ?? 0)}
                           currency={tx.currency ?? "AED"}
                           type={(tx.context_type as TransactionType) ?? "payment"}
                           direction={tx.sender_id === user?.id ? "out" : "in"}
                           status={tx.status === "completed" ? "completed" : tx.status === "pending" ? "pending" : "completed"}
                           timestamp={tx.created_at}
                           referenceCode={tx.reference_code}
                         />
                        {i < filteredTx.length - 1 && <div className="mx-4 border-t" style={{ borderColor: "hsl(var(--border) / 0.05)" }} />}
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}

          {activeTab === "qr" && (
            <motion.div key="qr" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
              <ReceiveQrPanel />
            </motion.div>
          )}

          {activeTab === "security" && (
            <motion.div key="security" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
              <WalletSecurityPanel />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

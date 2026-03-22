/**
 * WalletHubPage — Futuristic Wallet Pro with glassmorphic cards.
 * Single authoritative wallet page. Route: /wallet/hub + /wallet
 */
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useWalletAccounts } from "@/hooks/useWalletAccounts";
import { useWalletTransactions } from "@/payments/wallet-hooks";
import { createWalletAccount } from "@/lib/wallet/wallet-account";
import { createLedgerEntry, getOrCreateWalletAccount, recomputeWalletBalance } from "@/lib/wallet/ledger";
import {
  ArrowLeft, Plus, ArrowUpRight, ArrowDownLeft, QrCode, Eye, EyeOff,
  CreditCard, Wallet, Shield, ScanLine, Settings, TrendingUp, Sparkles,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import TransactionRow, { type TransactionType } from "@/components/wallet/TransactionRow";
import WalletSecurityPanel from "@/components/wallet/WalletSecurityPanel";
import ReceiveQrPanel from "@/components/wallet/ReceiveQrPanel";

type WalletTab = "fiat" | "qr" | "security";

export default function WalletHubPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { rows, loading } = useWalletAccounts(user?.id);
  const { items: txHistory, loading: txLoading } = useWalletTransactions(100);
  const [showBalance, setShowBalance] = useState(true);
  const [filter, setFilter] = useState<"all" | "in" | "out">("all");
  const [activeTab, setActiveTab] = useState<WalletTab>("fiat");

  const totalBalance = rows.reduce((sum: number, r: any) => sum + (r.balance || 0), 0);
  const mainCurrency = rows[0]?.currency || "AED";

  const quickActions = [
    { label: "Top up", icon: Plus, gradient: "from-emerald-500/20 to-emerald-600/10" },
    { label: "Send", icon: ArrowUpRight, gradient: "from-blue-500/20 to-blue-600/10" },
    { label: "Request", icon: ArrowDownLeft, gradient: "from-violet-500/20 to-violet-600/10" },
    { label: "Scan", icon: ScanLine, gradient: "from-amber-500/20 to-amber-600/10" },
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

  const handleTestTopUp = async () => {
    if (!user?.id) return;
    try {
      const { error } = await supabase
        .from("wallet_balances_v2" as any)
        .upsert(
          { user_id: user.id, balance: 100, currency: mainCurrency || "AED", updated_at: new Date().toISOString() },
          { onConflict: "user_id" }
        );
      if (error) throw error;
      const wallet = await getOrCreateWalletAccount({ ownerUserId: user.id, currency: mainCurrency || "AED" });
      await createLedgerEntry({
        walletAccountId: wallet.id, direction: "in", amount: 100,
        currency: wallet.currency || "AED", entryType: "top_up",
        referenceType: "test_credit", note: "Runtime test top-up",
      });
      await recomputeWalletBalance(wallet.id);
      toast.success("Test top-up added: 100 AED");
      window.location.reload();
    } catch {
      toast.error("Test top-up failed");
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
    <div className="min-h-[100dvh] flex flex-col bg-background" data-wallet-page>
      {/* Header */}
      <header className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl flex items-center justify-center active:scale-95 transition-transform bg-muted/60 backdrop-blur-sm">
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
                style={{ background: "linear-gradient(145deg, hsl(var(--primary)), hsl(var(--primary) / 0.75))" }}
              >
                {/* Decorative orbs */}
                <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full opacity-20" style={{ background: "radial-gradient(circle, hsl(var(--primary-foreground) / 0.3), transparent)" }} />
                <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full opacity-10" style={{ background: "radial-gradient(circle, hsl(var(--primary-foreground) / 0.4), transparent)" }} />

                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-medium text-primary-foreground/60 uppercase tracking-wider">Total Balance</p>
                    <TrendingUp className="w-4 h-4 text-primary-foreground/40" />
                  </div>
                  <p className="text-4xl font-black text-primary-foreground tracking-tight">
                    {showBalance ? `${totalBalance.toFixed(2)}` : "••••••"}
                  </p>
                  <p className="text-sm font-semibold text-primary-foreground/50 mt-0.5">{mainCurrency}</p>

                  {rows.length === 0 && !loading && (
                    <p className="text-xs text-primary-foreground/40 mt-3">No wallet yet</p>
                  )}
                  {rows.length > 0 && totalBalance <= 0 && (
                    <button onClick={handleTestTopUp} className="mt-4 rounded-xl bg-primary-foreground/15 backdrop-blur-sm px-4 py-2.5 text-xs font-bold text-primary-foreground active:scale-95 transition-transform">
                      Add test top-up (100 AED)
                    </button>
                  )}
                </div>
              </motion.div>

              {/* ── Quick Actions Grid ── */}
              <div className="grid grid-cols-4 gap-3">
                {quickActions.map((a, i) => (
                  <motion.button
                    key={a.label}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + i * 0.04 }}
                    onClick={() => navigate(quickRoutes[i])}
                    className="flex flex-col items-center gap-2 active:scale-90 transition-transform"
                  >
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center bg-gradient-to-br ${a.gradient} border border-border/10 backdrop-blur-sm`}>
                      <a.icon className="w-5 h-5 text-foreground" />
                    </div>
                    <span className="text-[10px] font-bold text-muted-foreground">{a.label}</span>
                  </motion.button>
                ))}
              </div>

              {/* ── Accounts ── */}
              {rows.length > 0 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3">Accounts</p>
                  <div className="space-y-2">
                    {rows.map((acc: any) => (
                      <div key={acc.id} className="flex items-center gap-3 rounded-2xl p-4 bg-card/80 backdrop-blur-sm border border-border/10">
                        <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: "hsl(var(--primary) / 0.08)" }}>
                          <Wallet className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-foreground capitalize">{acc.account_type || "Main"}</p>
                          <p className="text-[10px] text-muted-foreground">{acc.currency}</p>
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
                          title={tx.title || tx.context_type || "Transaction"}
                          amount={Number(tx.amount ?? 0)}
                          currency={tx.currency ?? "AED"}
                          type={(tx.context_type as TransactionType) ?? "payment"}
                          direction={tx.sender_id === user?.id ? "out" : "in"}
                          status={tx.status === "completed" ? "completed" : tx.status === "pending" ? "pending" : "completed"}
                          timestamp={tx.created_at}
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
            <motion.div key="qr" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }} className="space-y-4">
              <ReceiveQrPanel />
              <button
                onClick={() => navigate("/pay/scan")}
                className="w-full flex items-center justify-center gap-2 rounded-2xl p-4 bg-primary text-primary-foreground font-bold text-sm active:scale-[0.97] transition-transform"
              >
                <ScanLine className="w-5 h-5" />
                Scan to Pay
              </button>
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

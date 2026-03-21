/**
 * WalletHubPage — Wallet Pro with Fiat, QR Pay, Security tabs.
 * Single authoritative wallet page. Route: /wallet/hub + /wallet
 * Uses ONLY: wallet_accounts + wallet_ledger_entries + unified_wallet_transactions
 */
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useWalletAccounts } from "@/hooks/useWalletAccounts";
import { useWalletTransactions } from "@/payments/wallet-hooks";
import { createWalletAccount } from "@/lib/wallet/wallet-account";
import { createLedgerEntry, getOrCreateWalletAccount, recomputeWalletBalance } from "@/lib/wallet/ledger";
import {
  ArrowLeft, Plus, ArrowUpRight, ArrowDownLeft, QrCode, Eye, EyeOff,
  CreditCard, Wallet, Shield, ScanLine, Settings,
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
    { label: "Top up", icon: Plus, action: () => navigate("/wallet/top-up") },
    { label: "Send", icon: ArrowUpRight, action: () => navigate("/wallet/transfer") },
    { label: "Request", icon: ArrowDownLeft, action: () => navigate("/wallet/request") },
    { label: "Scan", icon: ScanLine, action: () => navigate("/pay/scan") },
  ];

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

  // Auto-create wallet if user has none
  useEffect(() => {
    if (!loading && rows.length === 0 && user?.id) {
      createDefaultWallet();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, rows.length, user?.id]);

  const TABS: { key: WalletTab; icon: typeof Wallet; label: string }[] = [
    { key: "fiat", icon: Wallet, label: "Wallet" },
    { key: "qr", icon: QrCode, label: "QR Pay" },
    { key: "security", icon: Shield, label: "Security" },
  ];

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background" data-wallet-page>
      <header className="flex items-center justify-between px-4 pt-4 pb-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl flex items-center justify-center active:scale-95 transition-transform bg-muted">
            <ArrowLeft className="w-4.5 h-4.5" />
          </button>
          <h1 className="text-lg font-bold text-foreground">Wallet Pro</h1>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setShowBalance(v => !v)} className="w-9 h-9 rounded-xl flex items-center justify-center bg-muted">
            {showBalance ? <Eye className="w-4 h-4 text-muted-foreground" /> : <EyeOff className="w-4 h-4 text-muted-foreground" />}
          </button>
          <button onClick={() => navigate("/settings/payment-methods")} className="w-9 h-9 rounded-xl flex items-center justify-center bg-muted">
            <Settings className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </header>

      <div className="px-4 pb-3">
        <div className="flex gap-1 p-1 rounded-2xl bg-muted/50">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[11px] font-bold transition-all"
                style={{
                  background: isActive ? "hsl(var(--card))" : "transparent",
                  color: isActive ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))",
                  boxShadow: isActive ? "var(--shadow-card)" : "none",
                }}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-24">
        <AnimatePresence mode="wait">
          {activeTab === "fiat" && (
            <motion.div key="fiat" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }} className="space-y-6">
              {/* Balance Card */}
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl p-5" style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.7))" }}>
                <p className="text-xs font-medium text-primary-foreground/70">Total Balance</p>
                <p className="text-3xl font-black text-primary-foreground mt-1">
                  {showBalance ? `${totalBalance.toFixed(2)} ${mainCurrency}` : "••••••"}
                </p>
                {rows.length === 0 && !loading && (
                  <p className="text-xs text-primary-foreground/60 mt-2">No wallet yet</p>
                )}
              </motion.div>

              {/* Quick Actions */}
              <div className="grid grid-cols-4 gap-3">
                {quickActions.map(a => (
                  <button key={a.label} onClick={a.action} className="flex flex-col items-center gap-1.5 active:scale-90 transition-transform">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-muted">
                      <a.icon className="w-5 h-5 text-foreground" />
                    </div>
                    <span className="text-[10px] font-semibold text-muted-foreground">{a.label}</span>
                  </button>
                ))}
              </div>

              {/* Accounts */}
              {rows.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-3">Accounts</p>
                  <div className="space-y-2">
                    {rows.map((acc: any) => (
                      <div key={acc.id} className="flex items-center gap-3 rounded-2xl p-4 bg-muted border border-border/10">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "hsl(var(--primary) / 0.1)" }}>
                          <Wallet className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground capitalize">{acc.account_type || "Main"}</p>
                          <p className="text-[10px] text-muted-foreground">{acc.currency}</p>
                        </div>
                        <span className="text-sm font-bold text-foreground">
                          {showBalance ? `${(acc.balance || 0).toFixed(2)}` : "••••"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* No wallet state */}
              {rows.length === 0 && !loading && (
                <div className="rounded-2xl p-6 flex flex-col items-center gap-3 text-center bg-muted border border-border/10">
                  <Wallet className="w-10 h-10 text-muted-foreground" />
                  <p className="text-sm font-semibold text-foreground">No wallet yet</p>
                  <p className="text-xs text-muted-foreground">Create a wallet to start transacting</p>
                  <button onClick={createDefaultWallet} className="mt-2 px-4 py-2 rounded-xl text-xs font-bold bg-primary text-primary-foreground active:scale-95 transition-transform">
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

              {/* Transaction History from unified_wallet_transactions */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Recent Activity</p>
                  <div className="flex gap-1">
                    {(["all", "in", "out"] as const).map(f => (
                      <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className="px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors"
                        style={{
                          background: filter === f ? "hsl(var(--primary) / 0.12)" : "transparent",
                          color: filter === f ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))",
                        }}
                      >
                        {f === "all" ? "All" : f === "in" ? "In" : "Out"}
                      </button>
                    ))}
                  </div>
                </div>

                {filteredTx.length === 0 ? (
                  <div className="rounded-2xl p-6 flex flex-col items-center gap-2 text-center bg-muted border border-border/10">
                    <CreditCard className="w-8 h-8 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">{txLoading ? "Loading..." : "No transactions yet"}</p>
                  </div>
                ) : (
                  <div className="rounded-2xl overflow-hidden bg-muted border border-border/10">
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
                        {i < filteredTx.length - 1 && <div className="mx-4 border-t" style={{ borderColor: "hsl(var(--border) / 0.06)" }} />}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === "qr" && (
            <motion.div key="qr" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }} className="space-y-4">
              <ReceiveQrPanel />
              <button
                onClick={() => navigate("/pay/scan")}
                className="w-full flex items-center justify-center gap-2 rounded-2xl p-4 bg-primary text-primary-foreground font-bold text-sm active:scale-[0.98] transition-transform"
              >
                <ScanLine className="w-5 h-5" />
                Scan to Pay
              </button>
            </motion.div>
          )}

          {activeTab === "security" && (
            <motion.div key="security" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }}>
              <WalletSecurityPanel />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

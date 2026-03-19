/**
 * WalletHubPage — Premium wallet dashboard with balance, actions, and transaction history.
 * Route: /wallet/hub
 */
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useWalletAccounts } from "@/hooks/useWalletAccounts";
import { createWalletAccount } from "@/lib/wallet/wallet-core";
import { ArrowLeft, Plus, ArrowUpRight, ArrowDownLeft, QrCode, Eye, EyeOff, CreditCard, Wallet, Filter } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";
import { toast } from "sonner";
import TransactionRow, { type TransactionType } from "@/components/wallet/TransactionRow";

// Mock transactions for display (will be replaced with real data)
const MOCK_TRANSACTIONS: { title: string; amount: number; currency: string; type: TransactionType; direction: "in" | "out"; status: "completed" | "pending" | "failed"; timestamp: string }[] = [
  { title: "Order #a8f3", amount: 67.00, currency: "AED", type: "payment", direction: "out", status: "completed", timestamp: new Date(Date.now() - 3600000).toISOString() },
  { title: "Refund - Pizza Milano", amount: 32.00, currency: "AED", type: "refund", direction: "in", status: "completed", timestamp: new Date(Date.now() - 7200000).toISOString() },
  { title: "Wallet top-up", amount: 200.00, currency: "AED", type: "top_up", direction: "in", status: "completed", timestamp: new Date(Date.now() - 86400000).toISOString() },
  { title: "Transfer to Ahmed", amount: 50.00, currency: "AED", type: "transfer", direction: "out", status: "pending", timestamp: new Date(Date.now() - 172800000).toISOString() },
  { title: "Escrow hold - Order #c2d1", amount: 89.00, currency: "AED", type: "escrow_hold", direction: "out", status: "completed", timestamp: new Date(Date.now() - 259200000).toISOString() },
  { title: "Escrow release", amount: 89.00, currency: "AED", type: "escrow_release", direction: "in", status: "completed", timestamp: new Date(Date.now() - 345600000).toISOString() },
];

export default function WalletHubPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { rows, loading } = useWalletAccounts(user?.id);
  const [showBalance, setShowBalance] = useState(true);
  const [filter, setFilter] = useState<"all" | "in" | "out">("all");

  const totalBalance = rows.reduce((sum: number, r: any) => sum + (r.balance || 0), 0);
  const mainCurrency = rows[0]?.currency || "AED";

  const quickActions = [
    { label: "Top up", icon: Plus, action: () => toast.info("Top up coming soon") },
    { label: "Send", icon: ArrowUpRight, action: () => navigate("/send") },
    { label: "Request", icon: ArrowDownLeft, action: () => toast.info("Request coming soon") },
    { label: "Scan", icon: QrCode, action: () => navigate("/pay/scan") },
  ];

  const filteredTx = MOCK_TRANSACTIONS.filter(tx => filter === "all" || tx.direction === filter);

  const createDefaultWallet = async () => {
    if (!user?.id) return;
    try {
      await createWalletAccount({ ownerUserId: user.id, ownerType: "user", currency: "AED", accountType: "fiat" });
      toast.success("Wallet created");
    } catch {
      toast.error("Could not create wallet");
    }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background" data-wallet-page>
      {/* Header */}
      <header className="flex items-center justify-between px-4 pt-4 pb-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/home")} className="w-9 h-9 rounded-xl flex items-center justify-center active:scale-95 transition-transform" style={{ background: "hsl(var(--muted))" }}>
            <ArrowLeft className="w-4.5 h-4.5" />
          </button>
          <h1 className="text-lg font-bold text-foreground">Wallet</h1>
        </div>
        <button onClick={() => setShowBalance(v => !v)} className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "hsl(var(--muted))" }}>
          {showBalance ? <Eye className="w-4 h-4 text-muted-foreground" /> : <EyeOff className="w-4 h-4 text-muted-foreground" />}
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-4 pb-24 space-y-6">
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
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: "hsl(var(--muted))" }}>
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
                <div key={acc.id} className="flex items-center gap-3 rounded-2xl p-4" style={{ background: "hsl(var(--muted))", border: "1px solid hsl(var(--border) / 0.12)" }}>
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
          <div className="rounded-2xl p-6 flex flex-col items-center gap-3 text-center" style={{ background: "hsl(var(--muted))", border: "1px solid hsl(var(--border) / 0.12)" }}>
            <Wallet className="w-10 h-10 text-muted-foreground" />
            <p className="text-sm font-semibold text-foreground">No wallet yet</p>
            <p className="text-xs text-muted-foreground">Create a wallet to start transacting</p>
            <button onClick={createDefaultWallet} className="mt-2 px-4 py-2 rounded-xl text-xs font-bold bg-primary text-primary-foreground active:scale-95 transition-transform">
              Create Wallet
            </button>
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="flex flex-col items-center gap-3 py-8">
            <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            <p className="text-xs text-muted-foreground">Loading wallet...</p>
          </div>
        )}

        {/* Transaction History */}
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
            <div className="rounded-2xl p-6 flex flex-col items-center gap-2 text-center" style={{ background: "hsl(var(--muted))", border: "1px solid hsl(var(--border) / 0.12)" }}>
              <CreditCard className="w-8 h-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No transactions yet</p>
            </div>
          ) : (
            <div className="rounded-2xl overflow-hidden" style={{ background: "hsl(var(--muted))", border: "1px solid hsl(var(--border) / 0.12)" }}>
              {filteredTx.map((tx, i) => (
                <div key={i}>
                  <TransactionRow {...tx} />
                  {i < filteredTx.length - 1 && <div className="mx-4 border-t" style={{ borderColor: "hsl(var(--border) / 0.06)" }} />}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Settings link */}
        <button
          onClick={() => navigate("/settings/payment-methods")}
          className="w-full flex items-center gap-3 rounded-2xl p-4 active:scale-[0.98] transition-transform"
          style={{ background: "hsl(var(--muted))", border: "1px solid hsl(var(--border) / 0.12)" }}
        >
          <CreditCard className="w-5 h-5 text-muted-foreground" />
          <span className="text-sm font-semibold text-foreground flex-1 text-left">Payment Methods</span>
          <ArrowUpRight className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>
    </div>
  );
}

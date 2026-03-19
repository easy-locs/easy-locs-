/**
 * WalletHubPage — Premium wallet dashboard with balance, actions, and transaction history.
 * Route: /wallet/hub
 */
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useWalletAccounts } from "@/hooks/useWalletAccounts";
import { createWalletAccount } from "@/lib/wallet/wallet-core";
import { ArrowLeft, Plus, ArrowUpRight, ArrowDownLeft, QrCode, Eye, EyeOff, CreditCard } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";
import { toast } from "sonner";

export default function WalletHubPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { rows, loading } = useWalletAccounts(user?.id);
  const [showBalance, setShowBalance] = useState(true);

  const totalBalance = rows.reduce((sum: number, r: any) => sum + (r.balance || 0), 0);
  const mainCurrency = rows[0]?.currency || "AED";

  const quickActions = [
    { label: "Top up", icon: Plus, action: () => toast.info("Top up coming soon") },
    { label: "Send", icon: ArrowUpRight, action: () => navigate("/send") },
    { label: "Request", icon: ArrowDownLeft, action: () => toast.info("Request coming soon") },
    { label: "Scan", icon: QrCode, action: () => navigate("/pay/scan") },
  ];

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
    <div className="min-h-[100dvh] flex flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between px-4 pt-4 pb-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-xl flex items-center justify-center active:scale-95 transition-transform"
            style={{ background: "hsl(var(--muted))" }}
          >
            <ArrowLeft className="w-4.5 h-4.5" />
          </button>
          <h1 className="text-lg font-bold text-foreground">Wallet</h1>
        </div>
        <button
          onClick={() => setShowBalance(v => !v)}
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: "hsl(var(--muted))" }}
        >
          {showBalance ? <Eye className="w-4 h-4 text-muted-foreground" /> : <EyeOff className="w-4 h-4 text-muted-foreground" />}
        </button>
      </header>

      <div className="flex-1 px-4 pb-24 space-y-5">
        {/* Balance card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-5"
          style={{
            background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.8))",
          }}
        >
          <p className="text-xs font-medium" style={{ color: "hsl(var(--primary-foreground) / 0.7)" }}>
            Total Balance
          </p>
          <p className="text-3xl font-black mt-1" style={{ color: "hsl(var(--primary-foreground))" }}>
            {showBalance ? `${totalBalance.toFixed(2)} ${mainCurrency}` : "••••••"}
          </p>
          <p className="text-xs mt-2" style={{ color: "hsl(var(--primary-foreground) / 0.6)" }}>
            {rows.length} account{rows.length !== 1 ? "s" : ""}
          </p>
        </motion.div>

        {/* Quick actions */}
        <div className="grid grid-cols-4 gap-3">
          {quickActions.map((a) => (
            <button
              key={a.label}
              onClick={a.action}
              className="flex flex-col items-center gap-1.5 active:scale-90 transition-transform"
            >
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center"
                style={{ background: "hsl(var(--primary) / 0.08)" }}
              >
                <a.icon className="w-5 h-5" style={{ color: "hsl(var(--primary))" }} />
              </div>
              <span className="text-[11px] font-semibold text-foreground">{a.label}</span>
            </button>
          ))}
        </div>

        {/* Accounts */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Accounts</h2>
            <button
              onClick={createDefaultWallet}
              className="text-[11px] font-bold uppercase tracking-wider"
              style={{ color: "hsl(var(--primary))" }}
            >
              + Add
            </button>
          </div>

          {loading && (
            <div className="rounded-2xl p-8 flex items-center justify-center" style={{ background: "hsl(var(--card))" }}>
              <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "hsl(var(--primary))", borderTopColor: "transparent" }} />
            </div>
          )}

          {!loading && rows.length === 0 && (
            <div
              className="rounded-2xl p-6 text-center"
              style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border) / 0.12)" }}
            >
              <CreditCard className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-sm font-medium text-muted-foreground">No wallet yet</p>
              <p className="text-xs text-muted-foreground/60 mt-0.5">Create your first wallet to get started</p>
              <button
                onClick={createDefaultWallet}
                className="mt-3 px-4 py-2 rounded-xl text-xs font-bold"
                style={{ background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}
              >
                Create Wallet
              </button>
            </div>
          )}

          <div className="space-y-2">
            {rows.map((row: any) => (
              <div
                key={row.id}
                className="rounded-2xl p-4 flex items-center gap-3"
                style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border) / 0.12)" }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: "hsl(var(--primary) / 0.08)" }}
                >
                  <CreditCard className="w-4.5 h-4.5" style={{ color: "hsl(var(--primary))" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{row.currency} · {row.account_type}</p>
                  <p className="text-xs text-muted-foreground">
                    Available: {showBalance ? row.available_balance : "••••"}
                  </p>
                </div>
                <p className="text-sm font-bold text-foreground">
                  {showBalance ? row.balance : "••••"}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Recent transactions placeholder */}
        <section>
          <h2 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Recent Activity</h2>
          <div
            className="rounded-2xl p-6 text-center"
            style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border) / 0.12)" }}
          >
            <p className="text-sm text-muted-foreground">No recent transactions</p>
          </div>
        </section>
      </div>
    </div>
  );
}

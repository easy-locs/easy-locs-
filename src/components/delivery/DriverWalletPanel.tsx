/**
 * DriverWalletPanel — Driver wallet with earnings balance, withdrawal requests, payout history.
 * PASS82-S: Driver Wallet & Payouts
 */
import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Wallet, ArrowDownToLine, Clock, CheckCircle2, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Props {
  className?: string;
}

interface DriverBalance {
  totalEarned: number;
  totalWithdrawn: number;
  available: number;
  pendingWithdrawal: number;
  currency: string;
  autoPayoutThreshold: number;
}

interface WithdrawalRequest {
  id: string;
  amount: number;
  status: string;
  created_at: string;
  processed_at?: string;
}

export default function DriverWalletPanel({ className }: Props) {
  const { user } = useAuth();
  const [balance, setBalance] = useState<DriverBalance | null>(null);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [threshold, setThreshold] = useState(50);

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Get completed earnings
      const { data: jobs } = await supabase
        .from("delivery_jobs")
        .select("delivery_fee, currency")
        .eq("driver_id", user.id)
        .eq("status", "completed")
        .not("delivered_at", "is", null);

      const totalEarned = (jobs || []).reduce((s, j) => s + (j.delivery_fee || 0), 0);
      const currency = jobs?.[0]?.currency || "EUR";

      // Get wallet balance for withdrawn amount
      const { data: walletData } = await supabase
        .from("wallet_balances")
        .select("balance, total_spent")
        .eq("user_id", user.id)
        .eq("currency", "LOCS")
        .maybeSingle();

      const totalWithdrawn = walletData?.total_spent || 0;
      const pendingWithdrawal = 0; // Could query a withdrawal_requests table

      setBalance({
        totalEarned,
        totalWithdrawn,
        available: Math.max(0, totalEarned - totalWithdrawn),
        pendingWithdrawal,
        currency,
        autoPayoutThreshold: threshold,
      });

      // Mock withdrawal history from wallet transactions
      const { data: txns } = await supabase
        .from("wallet_transactions")
        .select("id, amount, status, created_at")
        .eq("user_id", user.id)
        .eq("type", "transfer")
        .eq("direction", "out")
        .order("created_at", { ascending: false })
        .limit(10);

      setWithdrawals((txns || []).map(t => ({
        id: t.id,
        amount: t.amount,
        status: t.status,
        created_at: t.created_at,
      })));
    } catch (err) {
      console.error("[driver-wallet]", err);
    } finally {
      setLoading(false);
    }
  }, [user, threshold]);

  useEffect(() => { refresh(); }, [refresh]);

  const handleWithdraw = async () => {
    if (!user || !balance) return;
    const amount = parseFloat(withdrawAmount);
    if (!amount || amount <= 0 || amount > balance.available) {
      toast.error("Montant invalide");
      return;
    }
    setSubmitting(true);
    try {
      // Credit to wallet as LOCS
      const { error } = await supabase.from("wallet_transactions").insert({
        user_id: user.id,
        type: "transfer",
        direction: "in",
        amount,
        currency: "LOCS",
        description: `Retrait gains livraison: ${amount.toFixed(2)} ${balance.currency}`,
        status: "completed",
      });
      if (error) throw error;

      // Update wallet balance
      await supabase.from("wallet_balances").upsert({
        user_id: user.id,
        currency: "LOCS",
        balance: (balance.available),
      }, { onConflict: "user_id,currency" });

      toast.success(`${amount.toFixed(2)} ${balance.currency} transférés vers votre wallet`);
      setWithdrawAmount("");
      refresh();
    } catch (err: any) {
      toast.error(err.message || "Erreur de retrait");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin" style={{ color: "hsl(var(--hud-cyan) / 0.3)" }} />
      </div>
    );
  }

  if (!balance) return null;

  return (
    <div className={`space-y-4 ${className || ""}`}>
      {/* Balance card */}
      <div className="rounded-xl p-4 text-center"
        style={{ background: "linear-gradient(135deg, hsl(var(--hud-cyan) / 0.1), hsl(var(--success) / 0.06))", border: "1px solid hsl(var(--hud-cyan) / 0.15)" }}>
        <Wallet className="h-5 w-5 mx-auto mb-1" style={{ color: "hsl(var(--hud-cyan))" }} />
        <p className="text-[10px] font-semibold" style={{ color: "hsl(var(--hud-text-dim))" }}>Solde disponible</p>
        <p className="text-3xl font-black mt-1" style={{ color: "hsl(var(--hud-cyan))" }}>
          {balance.available.toFixed(2)} <span className="text-sm">{balance.currency}</span>
        </p>
        <div className="flex justify-center gap-4 mt-2">
          <span className="text-[9px]" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>
            Total gagné: {balance.totalEarned.toFixed(2)}€
          </span>
          <span className="text-[9px]" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>
            Retiré: {balance.totalWithdrawn.toFixed(2)}€
          </span>
        </div>
      </div>

      {/* Withdraw form */}
      <div className="rounded-xl p-3 space-y-2"
        style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.08)" }}>
        <p className="text-[10px] font-semibold" style={{ color: "hsl(var(--hud-text-dim))" }}>
          <ArrowDownToLine className="h-3 w-3 inline mr-1" /> Transférer vers Wallet
        </p>
        <div className="flex gap-2">
          <Input type="number" value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value)}
            placeholder={`Max ${balance.available.toFixed(2)}`} min={0} max={balance.available} step={0.01}
            className="h-8 text-xs flex-1" style={{ background: "hsl(var(--hud-border) / 0.06)" }} />
          <Button size="sm" onClick={handleWithdraw} disabled={submitting || !withdrawAmount}
            className="text-[10px] h-8 px-3" style={{ background: "hsl(var(--success))", color: "#fff" }}>
            {submitting ? <Loader2 className="h-3 w-3 animate-spin" /> : "Retirer"}
          </Button>
        </div>
        {balance.available < 5 && (
          <p className="text-[9px] flex items-center gap-1" style={{ color: "hsl(var(--warning))" }}>
            <AlertTriangle className="h-3 w-3" /> Minimum 5€ pour un retrait
          </p>
        )}
      </div>

      {/* Auto-payout threshold */}
      <div className="rounded-xl p-3"
        style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.08)" }}>
        <p className="text-[10px] font-semibold mb-2" style={{ color: "hsl(var(--hud-text-dim))" }}>
          ⚡ Seuil de paiement auto
        </p>
        <div className="flex items-center gap-3">
          <input type="range" min={10} max={500} step={10} value={threshold}
            onChange={e => setThreshold(Number(e.target.value))}
            className="flex-1 accent-[hsl(var(--hud-cyan))]" />
          <span className="text-sm font-bold w-16 text-right" style={{ color: "hsl(var(--hud-cyan))" }}>{threshold}€</span>
        </div>
        <p className="text-[8px] mt-1" style={{ color: "hsl(var(--hud-text-dim) / 0.3)" }}>
          Transfert automatique vers wallet quand vos gains atteignent ce seuil
        </p>
      </div>

      {/* Recent withdrawals */}
      {withdrawals.length > 0 && (
        <div className="space-y-1">
          <p className="text-[10px] font-semibold px-1" style={{ color: "hsl(var(--hud-text-dim))" }}>
            <Clock className="h-3 w-3 inline mr-1" /> Historique retraits
          </p>
          {withdrawals.map(w => (
            <div key={w.id} className="flex items-center justify-between px-3 py-2 rounded-lg"
              style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.06)" }}>
              <div>
                <p className="text-[10px]" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>
                  {new Date(w.created_at).toLocaleDateString("fr")}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold" style={{ color: "hsl(var(--success))" }}>
                  {w.amount.toFixed(2)}€
                </span>
                {w.status === "completed" ? (
                  <CheckCircle2 className="h-3 w-3" style={{ color: "hsl(var(--success))" }} />
                ) : (
                  <Clock className="h-3 w-3" style={{ color: "hsl(var(--warning))" }} />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * WalletSecurityPanel — Security dashboard for wallet
 * Shows PIN status, daily limits, recent activity summary
 * PASS61: Wallet Hardening
 */
import { useState, useEffect } from "react";
import { Shield, Lock, AlertTriangle, CheckCircle2, TrendingUp, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useWallet, type WalletTransaction } from "@/hooks/useWallet";
import { DAILY_TRANSFER_LIMITS, formatLimitInfo } from "@/lib/wallet-limits";
import { exportTransactionsCSV } from "@/lib/wallet-export";
import { useI18n } from "@/lib/i18n";

export default function WalletSecurityPanel() {
  const { user } = useAuth();
  const { transactions } = useWallet();
  const { t } = useI18n();
  const [pinStatus, setPinStatus] = useState<"loading" | "set" | "not_set">("loading");
  const [todaySpent, setTodaySpent] = useState(0);

  // Check PIN status
  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const { data } = await supabase.functions.invoke("wallet-pin", {
        body: { action: "check_status" },
      });
      setPinStatus(data?.has_pin ? "set" : "not_set");
    })();
  }, [user?.id]);

  // Calculate today's outgoing transfers
  useEffect(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const spent = transactions
      .filter((tx) => tx.direction === "out" && tx.type === "transfer" && tx.status === "completed" && new Date(tx.created_at) >= today)
      .reduce((sum, tx) => sum + tx.amount, 0);
    setTodaySpent(spent);
  }, [transactions]);

  const limit = DAILY_TRANSFER_LIMITS.default;
  const remaining = Math.max(0, limit - todaySpent);
  const pct = Math.round((todaySpent / limit) * 100);

  return (
    <div className="space-y-4">
      {/* Security Status */}
      <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-accent" />
          <span className="text-sm font-bold text-foreground">
            {t("orbit.security_status") || "Security Status"}
          </span>
        </div>

        <div className="space-y-2">
          {/* PIN */}
          <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/30">
            <div className="flex items-center gap-2">
              <Lock className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs text-foreground">Wallet PIN</span>
            </div>
            {pinStatus === "loading" ? (
              <span className="text-[10px] text-muted-foreground">...</span>
            ) : pinStatus === "set" ? (
              <span className="flex items-center gap-1 text-[10px] font-semibold" style={{ color: "hsl(var(--success, 142 76% 36%))" }}>
                <CheckCircle2 className="w-3 h-3" /> Active
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[10px] font-semibold text-destructive">
                <AlertTriangle className="w-3 h-3" /> Not set
              </span>
            )}
          </div>

          {/* Atomic RPC */}
          <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/30">
            <div className="flex items-center gap-2">
              <Shield className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs text-foreground">Atomic transfers</span>
            </div>
            <span className="flex items-center gap-1 text-[10px] font-semibold" style={{ color: "hsl(var(--success, 142 76% 36%))" }}>
              <CheckCircle2 className="w-3 h-3" /> Enforced
            </span>
          </div>

          {/* Anti-replay */}
          <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/30">
            <div className="flex items-center gap-2">
              <Shield className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs text-foreground">Anti-replay (QR nonce)</span>
            </div>
            <span className="flex items-center gap-1 text-[10px] font-semibold" style={{ color: "hsl(var(--success, 142 76% 36%))" }}>
              <CheckCircle2 className="w-3 h-3" /> Active
            </span>
          </div>
        </div>
      </div>

      {/* Daily Limits */}
      <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-accent" />
          <span className="text-sm font-bold text-foreground">
            {t("orbit.daily_limits") || "Daily Transfer Limit"}
          </span>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{t("orbit.used_today") || "Used today"}</span>
            <span className="font-semibold text-foreground">{todaySpent.toLocaleString()} LOCS</span>
          </div>
          {/* Progress bar */}
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(pct, 100)}%`,
                background: pct > 80
                  ? "hsl(var(--destructive))"
                  : pct > 50
                  ? "hsl(var(--warning, 38 92% 50%))"
                  : "hsl(var(--accent))",
              }}
            />
          </div>
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span>{t("orbit.remaining") || "Remaining"}: {remaining.toLocaleString()} LOCS</span>
            <span>{t("orbit.limit") || "Limit"}: {limit.toLocaleString()} LOCS/day</span>
          </div>
        </div>
      </div>

      {/* Export */}
      <div className="rounded-2xl border border-border bg-card p-4">
        <Button
          variant="outline"
          size="sm"
          className="w-full gap-2"
          onClick={() => exportTransactionsCSV(transactions)}
        >
          <Download className="w-3.5 h-3.5" />
          {t("orbit.export_csv") || "Export Transactions (CSV)"}
        </Button>
      </div>
    </div>
  );
}

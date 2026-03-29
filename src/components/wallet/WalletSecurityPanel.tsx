/**
 * WalletSecurityPanel — Premium futuristic fintech security dashboard.
 * Smart settings with visual status indicators.
 */
import { useState, useEffect, useCallback } from "react";
import {
  Shield, Lock, AlertTriangle, CheckCircle2, TrendingUp, Download,
  Fingerprint, Smartphone, Eye, KeyRound, Globe, Zap, ShieldCheck, ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import * as paymentsRepo from "@/repositories/payments.repository";
import { useAuth } from "@/contexts/AuthContext";
import { useWalletTransactions, type UnifiedTx } from "@/payments/wallet-hooks";
import { DAILY_TRANSFER_LIMITS } from "@/lib/wallet-limits";
import { motion } from "framer-motion";

function exportUnifiedCSV(txns: UnifiedTx[]) {
  const headers = ["Date", "Type", "Amount", "Currency", "Status", "Title"];
  const rows = txns.map((tx) => [
    new Date(tx.created_at).toISOString(),
    tx.context_type,
    tx.amount.toString(),
    tx.currency,
    tx.status,
    (tx.title || "").replace(/,/g, ";"),
  ]);
  const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `wallet-transactions-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

type SecurityFeature = {
  icon: React.ElementType;
  label: string;
  description: string;
  status: "active" | "warning" | "inactive" | "loading";
  action?: string;
};

export default function WalletSecurityPanel() {
  const { user } = useAuth();
  const { items: transactions, todaySpent } = useWalletTransactions();
  const [pinStatus, setPinStatus] = useState<"loading" | "set" | "not_set">("loading");

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const { data } = await paymentsRepo.invokeWalletPin({
        action: "check_status",
      });
      setPinStatus(data?.has_pin ? "set" : "not_set");
    })();
  }, [user?.id]);

  const limit = DAILY_TRANSFER_LIMITS.default;
  const remaining = Math.max(0, limit - todaySpent);
  const pct = Math.round((todaySpent / limit) * 100);

  const securityScore = (() => {
    let score = 40; // base
    if (pinStatus === "set") score += 30;
    if (user?.email) score += 15;
    if (user?.phone) score += 15;
    return Math.min(score, 100);
  })();

  const scoreColor = securityScore >= 80 ? "hsl(142 76% 36%)" : securityScore >= 50 ? "hsl(38 92% 50%)" : "hsl(var(--destructive))";

  const features: SecurityFeature[] = [
    {
      icon: Lock,
      label: "Wallet PIN",
      description: "6-digit PIN for all transfers",
      status: pinStatus === "loading" ? "loading" : pinStatus === "set" ? "active" : "warning",
      action: pinStatus !== "set" ? "Set PIN" : undefined,
    },
    {
      icon: Fingerprint,
      label: "Biometric Auth",
      description: "Face ID / Touch ID for quick access",
      status: "active",
    },
    {
      icon: ShieldCheck,
      label: "Atomic Transfers",
      description: "All-or-nothing transaction guarantee",
      status: "active",
    },
    {
      icon: Zap,
      label: "Anti-Replay (QR Nonce)",
      description: "Prevents double-scan exploits",
      status: "active",
    },
    {
      icon: Smartphone,
      label: "Device Trust",
      description: "New devices require verification",
      status: "active",
    },
    {
      icon: Eye,
      label: "Fraud Detection",
      description: "Real-time risk scoring engine",
      status: "active",
    },
    {
      icon: Globe,
      label: "AML Compliance",
      description: "Automated regulatory checks",
      status: "active",
    },
  ];

  return (
    <div className="space-y-5">
      {/* ── Security Score ── */}
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-3xl p-6 text-center relative overflow-hidden"
        style={{ background: "linear-gradient(145deg, hsl(var(--card)), hsl(var(--card) / 0.6))" }}
      >
        <div className="absolute inset-0 opacity-5" style={{ background: `radial-gradient(circle at 50% 30%, ${scoreColor}, transparent 70%)` }} />
        <div className="relative z-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-3" style={{ background: `conic-gradient(${scoreColor} ${securityScore}%, hsl(var(--muted) / 0.2) 0%)` }}>
            <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: "hsl(var(--card))" }}>
              <span className="text-xl font-black tabular-nums" style={{ color: scoreColor }}>{securityScore}</span>
            </div>
          </div>
          <p className="text-sm font-bold text-foreground">Security Score</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {securityScore >= 80 ? "Excellent — fully protected" : securityScore >= 50 ? "Good — enable PIN for maximum protection" : "Action needed — set up wallet PIN"}
          </p>
        </div>
      </motion.div>

      {/* ── Daily Limits ── */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-2xl border border-border/10 bg-card/80 p-4 space-y-3"
      >
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4" style={{ color: "hsl(var(--primary))" }} />
          <span className="text-xs font-bold text-foreground">Daily Transfer Limit</span>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground">Used today</span>
            <span className="font-bold text-foreground tabular-nums">{todaySpent.toLocaleString()} AED</span>
          </div>
          <div className="h-2 rounded-full bg-muted/30 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(pct, 100)}%` }}
              transition={{ delay: 0.3, duration: 0.8 }}
              className="h-full rounded-full"
              style={{
                background: pct > 80 ? "hsl(var(--destructive))" : pct > 50 ? "hsl(38 92% 50%)" : "hsl(var(--primary))",
              }}
            />
          </div>
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span>Remaining: {remaining.toLocaleString()}</span>
            <span>Limit: {limit.toLocaleString()}/day</span>
          </div>
        </div>
      </motion.div>

      {/* ── Security Features ── */}
      <div className="space-y-2">
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">
          Security Features
        </p>
        {features.map((f, i) => (
          <motion.div
            key={f.label}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 + i * 0.04 }}
            className="flex items-center gap-3 rounded-2xl p-3.5 border border-border/10 bg-card/60"
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{
              background: f.status === "active" ? "hsl(142 76% 36% / 0.08)" : f.status === "warning" ? "hsl(38 92% 50% / 0.08)" : "hsl(var(--muted) / 0.3)",
            }}>
              <f.icon className="w-4.5 h-4.5" style={{
                color: f.status === "active" ? "hsl(142 76% 36%)" : f.status === "warning" ? "hsl(38 92% 50%)" : "hsl(var(--muted-foreground))",
              }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-foreground">{f.label}</p>
              <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{f.description}</p>
            </div>
            {f.status === "loading" ? (
              <div className="w-4 h-4 rounded-full border-2 border-muted-foreground border-t-transparent animate-spin" />
            ) : f.status === "active" ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: "hsl(142 76% 36%)" }} />
            ) : f.status === "warning" ? (
              <div className="flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" style={{ color: "hsl(38 92% 50%)" }} />
                {f.action && (
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: "hsl(38 92% 50% / 0.1)", color: "hsl(38 92% 50%)" }}>
                    {f.action}
                  </span>
                )}
              </div>
            ) : (
              <ShieldAlert className="w-4 h-4 text-muted-foreground/40 shrink-0" />
            )}
          </motion.div>
        ))}
      </div>

      {/* ── Export ── */}
      <Button
        variant="outline"
        size="sm"
        className="w-full gap-2 rounded-xl h-11"
        onClick={() => exportUnifiedCSV(transactions)}
      >
        <Download className="w-3.5 h-3.5" />
        Export Transactions (CSV)
      </Button>
    </div>
  );
}

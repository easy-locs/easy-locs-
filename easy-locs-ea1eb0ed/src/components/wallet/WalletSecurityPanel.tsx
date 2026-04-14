import { useState, useEffect, useCallback } from "react";
import {
  Shield, Lock, AlertTriangle, CheckCircle2, TrendingUp, Download,
  Fingerprint, Smartphone, Eye, Zap, ShieldCheck, ShieldAlert, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import * as paymentsRepo from "@/repositories/payments.repository";
import { useAuth } from "@/contexts/AuthContext";
import { useWalletTransactions, useWalletBalance, type UnifiedTx } from "@/payments/wallet-hooks";
import { DAILY_TRANSFER_LIMITS } from "@/lib/wallet-limits";
import { getStoredBinding, ensureWalletBinding } from "@/lib/wallet/wallet-identity-binding";
import { guardWalletReady } from "@/lib/wallet/wallet-guard";
import { getDeviceFingerprint } from "@/lib/orbit-keystore";
import { motion, AnimatePresence } from "framer-motion";
import PinManagement from "@/components/security/PinManagement";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";

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
  onAction?: () => void;
};

function checkBiometricCapability(): "active" | "inactive" {
  if (typeof window === "undefined") return "inactive";
  if (window.PublicKeyCredential && typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === "function") {
    return "active";
  }
  return "inactive";
}
// NOTE: Biometric check above is capability-detection only (browser supports WebAuthn).
// Full WebAuthn challenge/response registration is pending server-side implementation.
// This does NOT gate transactions — it only contributes to the security score display.

export default function WalletSecurityPanel() {
  const { user } = useAuth();
  const { t } = useI18n();
  const { items: transactions, todaySpent } = useWalletTransactions();
  const { currency: walletCurrency } = useWalletBalance();
  const currency = walletCurrency || "AED";
  const [pinStatus, setPinStatus] = useState<"loading" | "set" | "not_set">("loading");
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [biometricStatus, setBiometricStatus] = useState<"active" | "inactive">("inactive");
  const [deviceBound, setDeviceBound] = useState(false);
  const [bindingInProgress, setBindingInProgress] = useState(false);

  const handleBindDevice = useCallback(async () => {
    if (!user?.id) return;
    setBindingInProgress(true);
    try {
      const guard = await guardWalletReady(user.id);
      if (!guard.valid || !guard.walletId) {
        toast.error(guard.error || t("wallet.not_ready"));
        return;
      }
      const deviceId = await getDeviceFingerprint();
      await ensureWalletBinding(user.id, deviceId, guard.walletId);
      setDeviceBound(true);
      toast.success(t("wallet.device_bound_ok"));
    } catch {
      toast.error(t("wallet.device_bind_fail"));
    } finally {
      setBindingInProgress(false);
    }
  }, [user?.id]);

  const refreshPinStatus = useCallback(async () => {
    if (!user?.id) return;
    try {
      const { data } = await paymentsRepo.invokeWalletPin({
        action: "check_status",
      });
      setPinStatus(data?.has_pin ? "set" : "not_set");
    } catch {
      setPinStatus("not_set");
    }
  }, [user?.id]);

  useEffect(() => {
    refreshPinStatus();
  }, [refreshPinStatus]);

  useEffect(() => {
    const bioStatus = checkBiometricCapability();
    setBiometricStatus(bioStatus);

    if (bioStatus === "active" && window.PublicKeyCredential?.isUserVerifyingPlatformAuthenticatorAvailable) {
      window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
        .then((available) => {
          setBiometricStatus(available ? "active" : "inactive");
        })
        .catch(() => setBiometricStatus("inactive"));
    }
  }, []);

  useEffect(() => {
    const binding = getStoredBinding();
    setDeviceBound(!!binding && binding.userId === user?.id);
  }, [user?.id]);

  const limit = DAILY_TRANSFER_LIMITS.default;
  const remaining = Math.max(0, limit - todaySpent);
  const pct = Math.round((todaySpent / limit) * 100);

  const securityScore = (() => {
    let score = 25;
    if (pinStatus === "set") score += 30;
    if (user?.email) score += 15;
    if (user?.phone) score += 10;
    if (deviceBound) score += 10;
    if (biometricStatus === "active") score += 10;
    return Math.min(score, 100);
  })();

  const scoreColor = securityScore >= 80 ? "hsl(142 76% 36%)" : securityScore >= 50 ? "hsl(var(--warning))" : "hsl(var(--destructive))";

  const scoreMessage = securityScore >= 80
    ? t("wallet.score_excellent")
    : securityScore >= 50
    ? pinStatus !== "set"
      ? t("wallet.score_good_pin")
      : t("wallet.score_good_phone")
    : t("wallet.score_action");

  const handlePinSet = useCallback(() => {
    setPinStatus("set");
    setShowPinSetup(false);
    refreshPinStatus();
  }, [refreshPinStatus]);

  const features: SecurityFeature[] = [
    {
      icon: Lock,
      label: t("wallet.pin_label"),
      description: pinStatus === "set"
        ? t("wallet.pin_active_desc")
        : t("wallet.pin_setup_desc"),
      status: pinStatus === "loading" ? "loading" : pinStatus === "set" ? "active" : "warning",
      action: pinStatus !== "set" ? t("wallet.set_pin") : undefined,
      onAction: () => setShowPinSetup(true),
    },
    {
      icon: Fingerprint,
      label: t("wallet.biometric_label"),
      description: biometricStatus === "active"
        ? t("wallet.biometric_available")
        : t("wallet.biometric_unavailable"),
      status: biometricStatus === "active" ? "active" : "inactive",
    },
    {
      icon: Smartphone,
      label: t("wallet.device_label"),
      description: deviceBound
        ? t("wallet.device_bound_desc")
        : t("wallet.device_unbound_desc"),
      status: bindingInProgress ? "loading" : deviceBound ? "active" : "warning",
      action: !deviceBound && !bindingInProgress ? t("wallet.bind") : undefined,
      onAction: handleBindDevice,
    },
    {
      icon: ShieldCheck,
      label: t("wallet.atomic_label"),
      description: t("wallet.atomic_desc"),
      status: "active",
    },
    {
      icon: Zap,
      label: t("wallet.replay_label"),
      description: t("wallet.replay_desc"),
      status: "active",
    },
    {
      icon: Eye,
      label: t("wallet.transfer_limits_label"),
      description: `${t("wallet.daily_limit")}: ${limit.toLocaleString()} ${currency || "AED"}`,
      status: "active",
    },
  ];

  return (
    <div className="space-y-5">
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
              <span className="text-xl font-extrabold tabular-nums" style={{ color: scoreColor }}>{securityScore}</span>
            </div>
          </div>
          <p className="text-sm font-bold text-foreground">{t("wallet.security_score")}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">{scoreMessage}</p>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-2xl border border-border/10 bg-card/80 p-4 space-y-3"
      >
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4" style={{ color: "hsl(var(--primary))" }} />
          <span className="text-xs font-bold text-foreground">{t("wallet.daily_limit")}</span>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground">{t("wallet.used_today")}</span>
            <span className="font-bold text-foreground tabular-nums">{todaySpent.toLocaleString()} {currency}</span>
          </div>
          <div className="h-2 rounded-full bg-muted/30 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(pct, 100)}%` }}
              transition={{ delay: 0.3, duration: 0.8 }}
              className="h-full rounded-full"
              style={{
                background: pct > 80 ? "hsl(var(--destructive))" : pct > 50 ? "hsl(var(--warning))" : "hsl(var(--primary))",
              }}
            />
          </div>
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span>{t("wallet.remaining").replace("{amount}", remaining.toLocaleString())}</span>
            <span>{t("wallet.limit_per_day").replace("{amount}", limit.toLocaleString())}</span>
          </div>
        </div>
      </motion.div>

      <div className="space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-1">
          {t("wallet.security_features")}
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
              background: f.status === "active" ? "hsl(142 76% 36% / 0.08)" : f.status === "warning" ? "hsl(var(--warning) / 0.08)" : "hsl(var(--muted) / 0.3)",
            }}>
              <f.icon className="w-4.5 h-4.5" style={{
                color: f.status === "active" ? "hsl(142 76% 36%)" : f.status === "warning" ? "hsl(var(--warning))" : "hsl(var(--muted-foreground))",
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
              <button
                onClick={f.onAction}
                className="flex items-center gap-1 active:scale-95 transition-transform"
              >
                <AlertTriangle className="w-3.5 h-3.5" style={{ color: "hsl(var(--warning))" }} />
                {f.action && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "hsl(var(--warning) / 0.1)", color: "hsl(var(--warning))" }}>
                    {f.action}
                  </span>
                )}
              </button>
            ) : (
              <ShieldAlert className="w-4 h-4 text-muted-foreground/40 shrink-0" />
            )}
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {showPinSetup && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden rounded-2xl border border-primary/20 bg-card p-4"
          >
            <PinManagement onPinSet={handlePinSet} compact />
          </motion.div>
        )}
      </AnimatePresence>

      <Button
        variant="outline"
        size="sm"
        className="w-full gap-2 rounded-xl h-11"
        onClick={() => exportUnifiedCSV(transactions)}
      >
        <Download className="w-3.5 h-3.5" />
        {t("wallet.export_csv")}
      </Button>
    </div>
  );
}

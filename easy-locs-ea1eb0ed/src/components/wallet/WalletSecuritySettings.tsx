import { useState, useEffect, useCallback } from "react";
import {
  Shield, Lock, Fingerprint, Smartphone, Eye, AlertTriangle,
  CheckCircle2, ShieldAlert, TrendingUp, Save, Loader2, KeyRound, RotateCcw, Download, Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useWalletTransactions, type UnifiedTx } from "@/payments/wallet-hooks";
import * as pinRepo from "@/repositories/security-pin.repository";
import * as biometricRepo from "@/repositories/biometric.repository";
import { getStoredBinding, ensureWalletBinding, clearWalletBinding } from "@/lib/wallet/wallet-identity-binding";
import { guardWalletReady } from "@/lib/wallet/wallet-guard";
import { getDeviceFingerprint } from "@/lib/orbit-keystore";
import { DAILY_TRANSFER_LIMITS } from "@/lib/wallet-limits";
import { useTrustScore } from "@/hooks/useTrustScore";
import { TrustLevelBadge, TrustLimitsCard } from "@/components/wallet/TrustLevelBadge";
import PinManagement from "@/components/security/PinManagement";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useI18n, tSafe } from "@/lib/i18n";
import { db } from "@/services/db";
import {
  checkBiometricCapability,
  performBiometricRegistration,
  getBiometricLabel,
  disableBiometricUnlock,
  type BiometricCapability,
} from "@/lib/auth/biometric";

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

export default function WalletSecuritySettings() {
  const { user } = useAuth();
  const { t } = useI18n();
  const ts = (key: string, fallback: string) => tSafe(t, key, fallback);
  const { items: transactions } = useWalletTransactions();

  const [pinStatus, setPinStatus] = useState<"loading" | "set" | "not_set">("loading");
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [showPinReset, setShowPinReset] = useState(false);

  const [deviceBound, setDeviceBound] = useState(false);
  const [bindingInProgress, setBindingInProgress] = useState(false);

  const [customLimit, setCustomLimit] = useState<number>(DAILY_TRANSFER_LIMITS.default);
  const [limitSaving, setLimitSaving] = useState(false);
  const [limitLoaded, setLimitLoaded] = useState(false);

  const [resetRequested, setResetRequested] = useState(false);

  const [biometricCapability, setBiometricCapability] = useState<BiometricCapability>({
    available: false, type: "none", isNative: false,
  });
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(true);
  const [biometricToggling, setBiometricToggling] = useState(false);
  const [credentials, setCredentials] = useState<{
    id: string;
    credential_id: string;
    device_name: string | null;
    created_at: string;
    last_used_at: string | null;
  }[]>([]);

  const refreshPinStatus = useCallback(async () => {
    if (!user?.id) return;
    try {
      const data = await pinRepo.checkPinStatus();
      setPinStatus(data?.has_pin ? "set" : "not_set");
    } catch {
      setPinStatus("not_set");
    }
  }, [user?.id]);

  useEffect(() => { refreshPinStatus(); }, [refreshPinStatus]);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      try {
        const { data } = await db
          .from("profiles")
          .select("daily_transfer_limit")
          .eq("id", user.id)
          .single();
        if (data?.daily_transfer_limit) {
          setCustomLimit(data.daily_transfer_limit);
        }
      } catch {}
      setLimitLoaded(true);
    })();
  }, [user?.id]);

  useEffect(() => {
    const binding = getStoredBinding();
    setDeviceBound(!!binding && binding.userId === user?.id);
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      setBiometricLoading(true);
      try {
        const [capability, enabled, creds] = await Promise.all([
          checkBiometricCapability(),
          biometricRepo.getBiometricStatus(),
          biometricRepo.getUserCredentials(),
        ]);
        setBiometricCapability(capability);
        setBiometricEnabled(enabled);
        setCredentials(creds);
      } catch {
        setBiometricCapability({ available: false, type: "none", isNative: false });
        setBiometricEnabled(false);
        setCredentials([]);
      } finally {
        setBiometricLoading(false);
      }
    })();
  }, [user?.id]);

  const handleEnableBiometric = useCallback(async () => {
    if (!user?.id) return;
    setBiometricToggling(true);
    try {
      const result = await performBiometricRegistration(
        `${getBiometricLabel(biometricCapability.type)} — ${navigator.platform}`
      );
      if (result.success) {
        setBiometricEnabled(true);
        const creds = await biometricRepo.getUserCredentials();
        setCredentials(creds);
        toast.success(ts("wallet.biometric_enabled", "Biometric authentication enabled"));
      } else {
        toast.error(result.error || ts("wallet.biometric_error", "Failed to enable biometric"));
      }
    } catch {
      toast.error(ts("wallet.biometric_error", "Failed to enable biometric"));
    } finally {
      setBiometricToggling(false);
    }
  }, [user?.id, biometricCapability.type, t]);

  const handleDisableBiometric = useCallback(async () => {
    if (!user?.id) return;
    setBiometricToggling(true);
    try {
      for (const cred of credentials) {
        await biometricRepo.deleteCredential(cred.id);
      }
      await biometricRepo.setBiometricEnabled(false);
      disableBiometricUnlock();
      setBiometricEnabled(false);
      setCredentials([]);
      toast.success(ts("wallet.biometric_disabled", "Biometric authentication disabled"));
    } catch {
      toast.error(ts("wallet.biometric_disable_error", "Failed to disable biometric"));
    } finally {
      setBiometricToggling(false);
    }
  }, [user?.id, credentials, t]);

  const handleDeleteCredential = useCallback(async (credId: string) => {
    try {
      await biometricRepo.deleteCredential(credId);
      const updated = credentials.filter((c) => c.id !== credId);
      setCredentials(updated);
      if (updated.length === 0) {
        await biometricRepo.setBiometricEnabled(false);
        setBiometricEnabled(false);
        disableBiometricUnlock();
      }
      toast.success(ts("wallet.credential_removed", "Credential removed"));
    } catch {
      toast.error(ts("wallet.credential_remove_error", "Failed to remove credential"));
    }
  }, [credentials, t]);

  const handleBindDevice = useCallback(async () => {
    if (!user?.id) return;
    setBindingInProgress(true);
    try {
      const guard = await guardWalletReady(user.id);
      if (!guard.valid || !guard.walletId) {
        toast.error(guard.error || ts("wallet.not_ready", "Wallet not ready"));
        return;
      }
      const deviceId = await getDeviceFingerprint();
      await ensureWalletBinding(user.id, deviceId, guard.walletId);
      await db
        .from("profiles")
        .update({ device_bound: true })
        .eq("id", user.id);
      setDeviceBound(true);
      toast.success(ts("wallet.device_bound_ok", "Device bound successfully"));
    } catch {
      toast.error(ts("wallet.device_bind_fail", "Failed to bind device"));
    } finally {
      setBindingInProgress(false);
    }
  }, [user?.id, t]);

  const handleUnbindDevice = useCallback(async () => {
    if (!user?.id) return;
    clearWalletBinding();
    try {
      await db
        .from("profiles")
        .update({ device_bound: false })
        .eq("id", user.id);
    } catch {}
    setDeviceBound(false);
    toast.success(ts("wallet.device_unbound_ok", "Device unbound"));
  }, [user?.id, t]);

  const handleSaveLimit = useCallback(async () => {
    if (!user?.id) return;
    setLimitSaving(true);
    try {
      const clampedLimit = Math.max(100, Math.min(customLimit, DAILY_TRANSFER_LIMITS.premium));
      await db
        .from("profiles")
        .update({ daily_transfer_limit: clampedLimit })
        .eq("id", user.id);
      setCustomLimit(clampedLimit);
      toast.success(ts("wallet.limit_saved", "Transfer limit updated"));
    } catch {
      toast.error(ts("wallet.save_error", "Failed to save limit"));
    } finally {
      setLimitSaving(false);
    }
  }, [user?.id, customLimit, t]);

  const handlePinReset = useCallback(async () => {
    try {
      setResetRequested(true);
      await pinRepo.requestPinReset();
      toast.success(ts("wallet.pin_reset_sent", "PIN reset email sent. Check your inbox."));
    } catch {
      toast.error(ts("wallet.pin_reset_error", "Failed to request PIN reset"));
    }
  }, [t]);

  const handlePinSet = useCallback(() => {
    setPinStatus("set");
    setShowPinSetup(false);
    refreshPinStatus();
  }, [refreshPinStatus]);

  const trust = useTrustScore();

  const sectionClass = "rounded-2xl border p-4 space-y-4";
  const sectionStyle = { background: "hsl(var(--card))", borderColor: "hsl(var(--border))" };

  return (
    <div className="space-y-4">
      {!trust.loading && (
        <div className="space-y-3">
          <TrustLevelBadge
            score={trust.score}
            level={trust.level}
            securityFlag={trust.securityFlag}
            showProgress
          />
          <TrustLimitsCard score={trust.score} level={trust.level} securityFlag={trust.securityFlag} />
        </div>
      )}

      <div className={sectionClass} style={sectionStyle}>
        <div className="flex items-center gap-2.5">
          <Lock className="w-5 h-5 text-primary shrink-0" />
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-foreground truncate">{ts("wallet.pin_label", "Wallet PIN")}</h3>
            <p className="text-[10px] text-muted-foreground truncate">{ts("wallet.pin_setup_desc", "6-digit PIN protects all transfers")}</p>
          </div>
          <div className="ml-auto shrink-0">
            {pinStatus === "loading" ? (
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            ) : pinStatus === "set" ? (
              <span className="flex items-center gap-1 text-[10px] font-bold text-green-500 whitespace-nowrap">
                <CheckCircle2 className="w-3.5 h-3.5" /> {ts("wallet.active", "Active")}
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[10px] font-bold whitespace-nowrap" style={{ color: "hsl(var(--warning))" }}>
                <AlertTriangle className="w-3.5 h-3.5" /> {ts("wallet.not_set", "Not set")}
              </span>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 gap-1.5 rounded-xl h-10"
            onClick={() => { setShowPinSetup(!showPinSetup); setShowPinReset(false); }}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span className="truncate">{pinStatus === "set" ? ts("wallet.change_pin", "Change PIN") : ts("wallet.set_pin", "Set PIN")}</span>
          </Button>
          {pinStatus === "set" && (
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 rounded-xl h-10 text-muted-foreground"
              onClick={handlePinReset}
              disabled={resetRequested}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="truncate">{ts("wallet.reset_pin", "Reset")}</span>
            </Button>
          )}
        </div>

        <AnimatePresence>
          {showPinSetup && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="rounded-xl border border-primary/20 bg-background p-4 mt-1">
                <PinManagement onPinSet={handlePinSet} compact />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className={sectionClass} style={sectionStyle}>
        <div className="flex items-center gap-2.5">
          <Fingerprint className="w-5 h-5 text-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-foreground truncate">{ts("wallet.biometric_label", "Biometric Auth")}</h3>
            <p className="text-[10px] text-muted-foreground truncate">
              {biometricLoading
                ? ts("wallet.biometric_checking", "Checking device capabilities...")
                : !biometricCapability.available
                  ? ts("wallet.biometric_not_available", "Biometric not available on this device")
                  : biometricEnabled
                    ? ts("wallet.biometric_active_desc", "Biometric protects sensitive operations")
                    : ts("wallet.biometric_enable_desc", "Use biometric to confirm transfers and unlock")}
            </p>
          </div>
          <div className="ml-auto shrink-0">
            {biometricLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            ) : biometricEnabled ? (
              <span className="flex items-center gap-1 text-[10px] font-bold text-green-500 whitespace-nowrap">
                <CheckCircle2 className="w-3.5 h-3.5" /> {ts("wallet.active", "Active")}
              </span>
            ) : (
              <ShieldAlert className="w-4 h-4 text-muted-foreground/40" />
            )}
          </div>
        </div>

        {!biometricLoading && biometricCapability.available && !biometricEnabled && (
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-1.5 rounded-xl h-10"
            onClick={handleEnableBiometric}
            disabled={biometricToggling}
          >
            {biometricToggling ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Fingerprint className="w-3.5 h-3.5" />
            )}
            <span className="truncate">
              {ts("wallet.enable_biometric", "Enable")} {getBiometricLabel(biometricCapability.type)}
            </span>
          </Button>
        )}

        {!biometricLoading && biometricEnabled && (
          <>
            {credentials.length > 0 && (
              <div className="space-y-2">
                {credentials.map((cred) => (
                  <div
                    key={cred.id}
                    className="flex items-center justify-between rounded-xl p-2.5 border"
                    style={{ borderColor: "hsl(var(--border))" }}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-medium text-foreground truncate">
                        {cred.device_name || "Biometric Device"}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {ts("wallet.registered", "Registered")} {new Date(cred.created_at).toLocaleDateString()}
                        {cred.last_used_at && (
                          <> · {ts("wallet.last_used", "Last used")} {new Date(cred.last_used_at).toLocaleDateString()}</>
                        )}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive shrink-0"
                      onClick={() => handleDeleteCredential(cred.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            <Button
              variant="destructive"
              size="sm"
              className="w-full gap-1.5 rounded-xl h-10"
              onClick={handleDisableBiometric}
              disabled={biometricToggling}
            >
              {biometricToggling ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Fingerprint className="w-3.5 h-3.5" />
              )}
              <span className="truncate">
                {ts("wallet.disable_biometric", "Disable Biometric Auth")}
              </span>
            </Button>
          </>
        )}

        {!biometricLoading && !biometricCapability.available && (
          <p className="text-[10px] text-muted-foreground/60 px-1">
            {ts("wallet.biometric_fallback_note", "Your device does not support biometric authentication. PIN protection is active for all sensitive operations.")}
          </p>
        )}
      </div>

      <div className={sectionClass} style={sectionStyle}>
        <div className="flex items-center gap-2.5">
          <TrendingUp className="w-5 h-5 text-primary shrink-0" />
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-foreground truncate">{ts("wallet.daily_limit", "Daily Transfer Limit")}</h3>
            <p className="text-[10px] text-muted-foreground truncate">{ts("wallet.limit_desc", "Max amount you can transfer per day")}</p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={100}
              max={DAILY_TRANSFER_LIMITS.premium}
              step={100}
              value={customLimit}
              onChange={(e) => setCustomLimit(Number(e.target.value))}
              className="flex-1 accent-primary h-2"
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={100}
                max={DAILY_TRANSFER_LIMITS.premium}
                value={customLimit}
                onChange={(e) => setCustomLimit(Math.max(100, Math.min(Number(e.target.value), DAILY_TRANSFER_LIMITS.premium)))}
                className="w-28 bg-background border border-border rounded-lg px-3 py-2 text-sm font-bold tabular-nums text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                style={{ fontSize: "16px" }}
              />
              <span className="text-xs text-muted-foreground font-medium">/ {ts("wallet.day", "day")}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 rounded-xl h-9"
              onClick={handleSaveLimit}
              disabled={limitSaving || !limitLoaded}
            >
              {limitSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span className="truncate">{ts("wallet.save", "Save")}</span>
            </Button>
          </div>
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span>{ts("wallet.min_limit", "Min")}: 100</span>
            <span>{ts("wallet.max_limit", "Max")}: {DAILY_TRANSFER_LIMITS.premium.toLocaleString()}</span>
          </div>
        </div>
      </div>

      <div className={sectionClass} style={sectionStyle}>
        <div className="flex items-center gap-2.5">
          <Smartphone className="w-5 h-5 text-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-foreground truncate">{ts("wallet.device_label", "Device Binding")}</h3>
            <p className="text-[10px] text-muted-foreground truncate">
              {deviceBound
                ? ts("wallet.device_bound_desc", "Wallet locked to this device")
                : ts("wallet.device_unbound_desc", "Wallet not bound to any device")}
            </p>
          </div>
          <div className="ml-auto shrink-0">
            {deviceBound ? (
              <CheckCircle2 className="w-4 h-4 text-green-500" />
            ) : (
              <ShieldAlert className="w-4 h-4 text-muted-foreground/40" />
            )}
          </div>
        </div>

        <div className="flex gap-2">
          {!deviceBound ? (
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-1.5 rounded-xl h-10"
              onClick={handleBindDevice}
              disabled={bindingInProgress}
            >
              {bindingInProgress ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Smartphone className="w-3.5 h-3.5" />}
              <span className="truncate">{ts("wallet.bind", "Bind This Device")}</span>
            </Button>
          ) : (
            <Button
              variant="destructive"
              size="sm"
              className="w-full gap-1.5 rounded-xl h-10"
              onClick={handleUnbindDevice}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span className="truncate">{ts("wallet.unbind", "Unbind Device")}</span>
            </Button>
          )}
        </div>
      </div>

      <div className="rounded-2xl border p-4 space-y-3" style={{ background: "hsl(var(--card))", borderColor: "hsl(var(--border))" }}>
        <div className="flex items-center gap-2.5">
          <Eye className="w-5 h-5 text-primary shrink-0" />
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-foreground truncate">{ts("wallet.security_overview", "Security Overview")}</h3>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: "PIN", ok: pinStatus === "set" },
            { label: ts("wallet.biometric_label", "Biometric"), ok: biometricEnabled },
            { label: ts("wallet.device_label", "Device"), ok: deviceBound },
            { label: ts("wallet.email_verified", "Email"), ok: !!user?.email },
          ].map((item) => (
            <div
              key={item.label}
              className="flex items-center gap-2 rounded-xl p-2.5 border"
              style={{
                borderColor: item.ok ? "hsl(142 76% 36% / 0.2)" : "hsl(var(--border))",
                background: item.ok ? "hsl(142 76% 36% / 0.05)" : "hsl(var(--muted) / 0.2)",
              }}
            >
              {item.ok ? (
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" style={{ color: "hsl(142 76% 36%)" }} />
              ) : (
                <ShieldAlert className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
              )}
              <span className="text-[11px] font-medium text-foreground truncate">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      <Button
        variant="outline"
        size="sm"
        className="w-full gap-2 rounded-xl h-11"
        onClick={() => exportUnifiedCSV(transactions)}
      >
        <Download className="w-3.5 h-3.5" />
        {ts("wallet.export_csv", "Export CSV")}
      </Button>
    </div>
  );
}

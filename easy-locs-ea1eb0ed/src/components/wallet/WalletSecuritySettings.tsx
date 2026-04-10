import { useState, useEffect, useCallback } from "react";
import {
  Shield, Lock, Fingerprint, Smartphone, Eye, AlertTriangle,
  CheckCircle2, ShieldAlert, TrendingUp, Save, Loader2, KeyRound, RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import * as pinRepo from "@/repositories/security-pin.repository";
import * as settingsRepo from "@/repositories/settings.repository";
import { getStoredBinding, ensureWalletBinding, clearWalletBinding } from "@/lib/wallet/wallet-identity-binding";
import { guardWalletReady } from "@/lib/wallet/wallet-guard";
import { getDeviceFingerprint } from "@/lib/orbit-keystore";
import { DAILY_TRANSFER_LIMITS } from "@/lib/wallet-limits";
import PinManagement from "@/components/security/PinManagement";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";

export default function WalletSecuritySettings() {
  const { user } = useAuth();
  const { t } = useI18n();

  const [pinStatus, setPinStatus] = useState<"loading" | "set" | "not_set">("loading");
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [showPinReset, setShowPinReset] = useState(false);

  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricSaving, setBiometricSaving] = useState(false);

  const [deviceBound, setDeviceBound] = useState(false);
  const [bindingInProgress, setBindingInProgress] = useState(false);

  const [customLimit, setCustomLimit] = useState<number>(DAILY_TRANSFER_LIMITS.default);
  const [limitSaving, setLimitSaving] = useState(false);
  const [limitLoaded, setLimitLoaded] = useState(false);

  const [resetRequested, setResetRequested] = useState(false);

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
        const settings = await settingsRepo.fetchSecuritySettings(user.id);
        setBiometricEnabled(settings?.biometric_enabled ?? false);
      } catch {}
    })();
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      try {
        const { data } = await supabase
          .from("profiles" as any)
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
    (async () => {
      if (typeof window === "undefined") return;
      try {
        if (window.PublicKeyCredential?.isUserVerifyingPlatformAuthenticatorAvailable) {
          const available = await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
          setBiometricAvailable(available);
        }
      } catch {
        setBiometricAvailable(false);
      }
    })();
  }, []);

  useEffect(() => {
    const binding = getStoredBinding();
    setDeviceBound(!!binding && binding.userId === user?.id);
  }, [user?.id]);

  const handleToggleBiometric = useCallback(async () => {
    if (!user?.id) return;
    setBiometricSaving(true);
    try {
      const newValue = !biometricEnabled;

      if (newValue && biometricAvailable) {
        try {
          const credential = await navigator.credentials.create({
            publicKey: {
              challenge: crypto.getRandomValues(new Uint8Array(32)),
              rp: { name: "Easy-Locs Wallet", id: window.location.hostname },
              user: {
                id: new TextEncoder().encode(user.id),
                name: user.email || "user",
                displayName: user.email || "User",
              },
              pubKeyCredParams: [
                { alg: -7, type: "public-key" },
                { alg: -257, type: "public-key" },
              ],
              authenticatorSelection: {
                authenticatorAttachment: "platform",
                userVerification: "required",
              },
              timeout: 60000,
            },
          });

          if (!credential) {
            toast.error(t("wallet.biometric_registration_failed" as any) || "Biometric registration cancelled");
            setBiometricSaving(false);
            return;
          }

          const credId = (credential as PublicKeyCredential).rawId;
          const credIdB64 = btoa(String.fromCharCode(...new Uint8Array(credId)));
          await supabase
            .from("profiles" as any)
            .update({ webauthn_credential_id: credIdB64 })
            .eq("id", user.id);
        } catch (err: any) {
          if (err.name === "NotAllowedError") {
            toast.error(t("wallet.biometric_denied" as any) || "Biometric registration denied");
          } else {
            toast.error(t("wallet.biometric_error" as any) || "Biometric registration failed");
          }
          setBiometricSaving(false);
          return;
        }
      }

      if (!newValue) {
        await supabase
          .from("profiles" as any)
          .update({ webauthn_credential_id: null })
          .eq("id", user.id);
      }

      await settingsRepo.updateSecuritySetting(user.id, "biometric_enabled", newValue);
      setBiometricEnabled(newValue);
      toast.success(
        newValue
          ? (t("wallet.biometric_activated" as any) || "Biometric authentication activated")
          : (t("wallet.biometric_deactivated" as any) || "Biometric authentication deactivated")
      );
    } catch {
      toast.error(t("wallet.save_error" as any) || "Failed to update setting");
    } finally {
      setBiometricSaving(false);
    }
  }, [user?.id, user?.email, biometricEnabled, biometricAvailable, t]);

  const handleBindDevice = useCallback(async () => {
    if (!user?.id) return;
    setBindingInProgress(true);
    try {
      const guard = await guardWalletReady(user.id);
      if (!guard.valid || !guard.walletId) {
        toast.error(guard.error || (t("wallet.not_ready" as any) || "Wallet not ready"));
        return;
      }
      const deviceId = await getDeviceFingerprint();
      await ensureWalletBinding(user.id, deviceId, guard.walletId);
      await supabase
        .from("profiles" as any)
        .update({ device_bound: true })
        .eq("id", user.id);
      setDeviceBound(true);
      toast.success(t("wallet.device_bound_ok" as any) || "Device bound successfully");
    } catch {
      toast.error(t("wallet.device_bind_fail" as any) || "Failed to bind device");
    } finally {
      setBindingInProgress(false);
    }
  }, [user?.id, t]);

  const handleUnbindDevice = useCallback(async () => {
    if (!user?.id) return;
    clearWalletBinding();
    try {
      await supabase
        .from("profiles" as any)
        .update({ device_bound: false })
        .eq("id", user.id);
    } catch {}
    setDeviceBound(false);
    toast.success(t("wallet.device_unbound_ok" as any) || "Device unbound");
  }, [user?.id, t]);

  const handleSaveLimit = useCallback(async () => {
    if (!user?.id) return;
    setLimitSaving(true);
    try {
      const clampedLimit = Math.max(100, Math.min(customLimit, DAILY_TRANSFER_LIMITS.premium));
      await supabase
        .from("profiles" as any)
        .update({ daily_transfer_limit: clampedLimit })
        .eq("id", user.id);
      setCustomLimit(clampedLimit);
      toast.success(t("wallet.limit_saved" as any) || "Transfer limit updated");
    } catch {
      toast.error(t("wallet.save_error" as any) || "Failed to save limit");
    } finally {
      setLimitSaving(false);
    }
  }, [user?.id, customLimit, t]);

  const handlePinReset = useCallback(async () => {
    try {
      setResetRequested(true);
      await pinRepo.requestPinReset();
      toast.success(t("wallet.pin_reset_sent" as any) || "PIN reset email sent. Check your inbox.");
    } catch {
      toast.error(t("wallet.pin_reset_error" as any) || "Failed to request PIN reset");
    }
  }, [t]);

  const handlePinSet = useCallback(() => {
    setPinStatus("set");
    setShowPinSetup(false);
    refreshPinStatus();
  }, [refreshPinStatus]);

  const sectionClass = "rounded-2xl border p-4 space-y-4";
  const sectionStyle = { background: "hsl(var(--card))", borderColor: "hsl(var(--border))" };

  return (
    <div className="space-y-4">
      <div className={sectionClass} style={sectionStyle}>
        <div className="flex items-center gap-2.5">
          <Lock className="w-5 h-5 text-primary" />
          <div>
            <h3 className="text-sm font-bold text-foreground">{t("wallet.pin_label" as any) || "Wallet PIN"}</h3>
            <p className="text-[10px] text-muted-foreground">{t("wallet.pin_setup_desc" as any) || "6-digit PIN protects all transfers"}</p>
          </div>
          <div className="ml-auto">
            {pinStatus === "loading" ? (
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            ) : pinStatus === "set" ? (
              <span className="flex items-center gap-1 text-[10px] font-bold text-green-500">
                <CheckCircle2 className="w-3.5 h-3.5" /> {t("wallet.active" as any) || "Active"}
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[10px] font-bold" style={{ color: "hsl(38 92% 50%)" }}>
                <AlertTriangle className="w-3.5 h-3.5" /> {t("wallet.not_set" as any) || "Not set"}
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
            {pinStatus === "set" ? (t("wallet.change_pin" as any) || "Change PIN") : (t("wallet.set_pin" as any) || "Set PIN")}
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
              {t("wallet.reset_pin" as any) || "Reset"}
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
          <Fingerprint className="w-5 h-5 text-primary" />
          <div className="flex-1">
            <h3 className="text-sm font-bold text-foreground">{t("wallet.biometric_label" as any) || "Biometric Auth"}</h3>
            <p className="text-[10px] text-muted-foreground">
              {biometricAvailable
                ? (t("wallet.biometric_available" as any) || "Platform authenticator available")
                : (t("wallet.biometric_unavailable" as any) || "Not available on this device")}
            </p>
          </div>
          <div className="ml-auto">
            {biometricAvailable ? (
              biometricEnabled ? (
                <CheckCircle2 className="w-4 h-4 text-green-500" />
              ) : (
                <ShieldAlert className="w-4 h-4 text-muted-foreground/40" />
              )
            ) : (
              <ShieldAlert className="w-4 h-4 text-muted-foreground/40" />
            )}
          </div>
        </div>

        <Button
          variant={biometricEnabled ? "destructive" : "outline"}
          size="sm"
          className="w-full gap-1.5 rounded-xl h-10"
          onClick={handleToggleBiometric}
          disabled={!biometricAvailable || biometricSaving}
        >
          {biometricSaving ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Fingerprint className="w-3.5 h-3.5" />
          )}
          {biometricEnabled
            ? (t("wallet.disable_biometric" as any) || "Disable Biometric")
            : (t("wallet.enable_biometric" as any) || "Enable Biometric")}
        </Button>
        {!biometricAvailable && (
          <p className="text-[10px] text-muted-foreground/60 text-center">
            {t("wallet.biometric_not_supported" as any) || "Your device does not support biometric authentication (Face ID / Touch ID / fingerprint)."}
          </p>
        )}
      </div>

      <div className={sectionClass} style={sectionStyle}>
        <div className="flex items-center gap-2.5">
          <TrendingUp className="w-5 h-5 text-primary" />
          <div>
            <h3 className="text-sm font-bold text-foreground">{t("wallet.daily_limit" as any) || "Daily Transfer Limit"}</h3>
            <p className="text-[10px] text-muted-foreground">{t("wallet.limit_desc" as any) || "Max amount you can transfer per day"}</p>
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
              />
              <span className="text-xs text-muted-foreground font-medium">/ {t("wallet.day" as any) || "day"}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 rounded-xl h-9"
              onClick={handleSaveLimit}
              disabled={limitSaving || !limitLoaded}
            >
              {limitSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              {t("wallet.save" as any) || "Save"}
            </Button>
          </div>
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span>{t("wallet.min_limit" as any) || "Min"}: 100</span>
            <span>{t("wallet.max_limit" as any) || "Max"}: {DAILY_TRANSFER_LIMITS.premium.toLocaleString()}</span>
          </div>
        </div>
      </div>

      <div className={sectionClass} style={sectionStyle}>
        <div className="flex items-center gap-2.5">
          <Smartphone className="w-5 h-5 text-primary" />
          <div className="flex-1">
            <h3 className="text-sm font-bold text-foreground">{t("wallet.device_label" as any) || "Device Binding"}</h3>
            <p className="text-[10px] text-muted-foreground">
              {deviceBound
                ? (t("wallet.device_bound_desc" as any) || "Wallet locked to this device")
                : (t("wallet.device_unbound_desc" as any) || "Wallet not bound to any device")}
            </p>
          </div>
          <div className="ml-auto">
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
              {t("wallet.bind" as any) || "Bind This Device"}
            </Button>
          ) : (
            <Button
              variant="destructive"
              size="sm"
              className="w-full gap-1.5 rounded-xl h-10"
              onClick={handleUnbindDevice}
            >
              <Smartphone className="w-3.5 h-3.5" />
              {t("wallet.unbind" as any) || "Unbind Device"}
            </Button>
          )}
        </div>
      </div>

      <div className="rounded-2xl border p-4 space-y-3" style={{ background: "hsl(var(--card))", borderColor: "hsl(var(--border))" }}>
        <div className="flex items-center gap-2.5">
          <Eye className="w-5 h-5 text-primary" />
          <div>
            <h3 className="text-sm font-bold text-foreground">{t("wallet.security_overview" as any) || "Security Overview"}</h3>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: "PIN", ok: pinStatus === "set" },
            { label: t("wallet.biometric_label" as any) || "Biometric", ok: biometricEnabled },
            { label: t("wallet.device_label" as any) || "Device", ok: deviceBound },
            { label: t("wallet.email_verified" as any) || "Email", ok: !!user?.email },
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
              <span className="text-[11px] font-medium text-foreground">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

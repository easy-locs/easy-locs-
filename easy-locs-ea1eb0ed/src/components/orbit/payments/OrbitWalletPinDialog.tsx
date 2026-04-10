/**
 * OrbitWalletPinDialog — PIN setup & verification for wallet transactions
 * Uses server-side bcrypt hashing via edge function.
 * Server-side lockout tracking (no localStorage dependency).
 */
import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Lock, AlertTriangle, Loader2, X, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import * as pinRepo from "@/repositories/security-pin.repository";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";

interface OrbitWalletPinDialogProps {
  open: boolean;
  onVerified: () => void;
  onCancel: () => void;
}

export default function OrbitWalletPinDialog({ open, onVerified, onCancel }: OrbitWalletPinDialogProps) {
  const { t } = useI18n();
  const [mode, setMode] = useState<"loading" | "setup" | "verify" | "recovery_sent">("loading");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [step, setStep] = useState<"enter" | "confirm">("enter");
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [lockedUntil, setLockedUntil] = useState<string | null>(null);
  const [lockCountdown, setLockCountdown] = useState(0);
  const [attemptsRemaining, setAttemptsRemaining] = useState(5);
  const [resetRequesting, setResetRequesting] = useState(false);

  // Check PIN status from server
  useEffect(() => {
    if (!open) return;
    setPin("");
    setConfirmPin("");
    setStep("enter");
    setError(null);

    const check = async () => {
      try {
        const data = await pinRepo.checkPinStatus();
        if (!data) { setMode("setup"); return; }
        setMode(data.has_pin ? "verify" : "setup");
        setIsLocked(data.is_locked);
        setLockedUntil(data.locked_until);
        setAttemptsRemaining(5 - (data.failed_attempts || 0));
      } catch { setMode("setup"); }
    };
    check();
  }, [open]);

  // Lockout countdown
  useEffect(() => {
    if (!isLocked || !lockedUntil) { setLockCountdown(0); return; }
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((new Date(lockedUntil).getTime() - Date.now()) / 1000));
      setLockCountdown(remaining);
      if (remaining <= 0) {
        setIsLocked(false);
        setLockedUntil(null);
        setAttemptsRemaining(5);
      }
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [isLocked, lockedUntil]);

  const handleSetup = useCallback(async () => {
    if (step === "enter") {
      if (pin.length !== 6) { setError(t("wallet.enter_6_digit")); return; }
      setStep("confirm");
      setConfirmPin("");
      setError(null);
      return;
    }
    if (confirmPin !== pin) { setError(t("wallet.pins_dont_match")); setConfirmPin(""); return; }
    setProcessing(true);
    try {
      const data = await pinRepo.setPin(pin);
      if (data?.error) { setError(data.error); setProcessing(false); return; }
    } catch (err: any) { setError(t("wallet.pin_set_failed")); setProcessing(false); return; }
    setProcessing(false);
    toast.success(t("wallet.pin_set_success"));
    onVerified();
  }, [step, pin, confirmPin, onVerified]);

  const handleVerify = useCallback(async () => {
    if (isLocked) return;
    if (pin.length !== 6) { setError(t("wallet.enter_6_digit")); return; }
    setProcessing(true);
    try {
      const data = await pinRepo.verifyPin(pin);
      setProcessing(false);

      if (!data) { setError(t("wallet.server_error")); return; }
    if (data?.verified) {
      setAttemptsRemaining(5);
      onVerified();
      return;
    }
    setPin("");
    if (data?.locked) {
      setIsLocked(true);
      setLockedUntil(data.locked_until);
      setError(data.error || t("wallet.wallet_locked"));
    } else {
      setAttemptsRemaining(data?.attempts_remaining ?? 0);
      setError(data?.error || t("wallet.wrong_pin"));
    }
    } catch { setError(t("wallet.server_error")); setProcessing(false); }
  }, [pin, isLocked, onVerified]);

  const handleForgotPin = useCallback(async () => {
    setResetRequesting(true);
    try {
      await pinRepo.requestPinReset();
      setMode("recovery_sent");
      toast.success(t("wallet.recovery_sent"));
    } catch {
      toast.error(t("wallet.recovery_failed"));
    } finally {
      setResetRequesting(false);
    }
  }, []);

  if (!open) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="w-full max-w-sm rounded-2xl bg-card border border-border shadow-2xl p-6"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              {isLocked ? <AlertTriangle className="w-5 h-5 text-warning" /> : <Lock className="w-5 h-5 text-primary" />}
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">
                {mode === "setup" ? t("wallet.set_pin_title") : t("wallet.enter_pin_title")}
              </h3>
              <p className="text-[10px] text-muted-foreground">
                {mode === "setup"
                  ? step === "enter" ? t("wallet.choose_pin") : t("wallet.confirm_pin")
                  : t("wallet.payment_security")}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onCancel} className="rounded-full h-8 w-8">
            <X className="w-4 h-4" />
          </Button>
        </div>

        {mode === "loading" ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="flex flex-col items-center gap-5">
            {mode === "recovery_sent" ? (
              <div className="text-center space-y-3">
                <Mail className="w-12 h-12 text-primary mx-auto" />
                <p className="text-sm font-medium text-foreground">{t("wallet.recovery_email_sent")}</p>
                <p className="text-xs text-muted-foreground">
                  {t("wallet.check_inbox_reset")}
                </p>
                <Button variant="outline" className="w-full mt-2" onClick={() => { setMode("setup"); setStep("enter"); setPin(""); setError(null); }}>
                  {t("wallet.set_new_pin")}
                </Button>
              </div>
            ) : isLocked ? (
              <div className="text-center space-y-3">
                <AlertTriangle className="w-12 h-12 text-warning mx-auto" />
                <p className="text-sm font-medium text-foreground">{t("wallet.wallet_locked_title")}</p>
                <p className="text-xs text-muted-foreground">
                  {t("wallet.too_many_attempts")} {Math.floor(lockCountdown / 60)}:{(lockCountdown % 60).toString().padStart(2, "0")}
                </p>
                <button
                  onClick={handleForgotPin}
                  disabled={resetRequesting}
                  className="text-xs text-accent hover:underline mt-2 flex items-center gap-1 mx-auto"
                >
                  {resetRequesting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Mail className="w-3 h-3" />}
                  {t("wallet.forgot_pin_reset")}
                </button>
              </div>
            ) : (
              <>
                <InputOTP
                  maxLength={6}
                  value={mode === "setup" && step === "confirm" ? confirmPin : pin}
                  onChange={(v) => {
                    setError(null);
                    if (mode === "setup" && step === "confirm") {
                      setConfirmPin(v);
                      if (v.length === 6) setTimeout(() => handleSetup(), 100);
                    } else {
                      setPin(v);
                      if (v.length === 6 && mode === "verify") setTimeout(() => handleVerify(), 100);
                      else if (v.length === 6 && mode === "setup" && step === "enter") setTimeout(() => handleSetup(), 100);
                    }
                  }}
                  autoFocus
                >
                  <InputOTPGroup>
                    {[0, 1, 2, 3, 4, 5].map((i) => (
                      <InputOTPSlot key={i} index={i} className="w-11 h-12 text-lg font-bold" />
                    ))}
                  </InputOTPGroup>
                </InputOTP>

                <AnimatePresence>
                  {error && (
                    <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-xs text-destructive text-center">
                      {error}
                    </motion.p>
                  )}
                </AnimatePresence>

                <Button
                  onClick={mode === "setup" ? handleSetup : handleVerify}
                  disabled={processing || (mode === "setup" && step === "confirm" ? confirmPin.length !== 6 : pin.length !== 6)}
                  className="w-full h-12 rounded-xl bg-accent text-accent-foreground hover:bg-accent/90 font-bold"
                >
                  {processing ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Shield className="w-4 h-4 mr-2" />
                  )}
                  {mode === "setup"
                    ? step === "enter" ? t("wallet.next") : t("wallet.set_pin")
                    : t("wallet.confirm_payment")}
                </Button>
              </>
            )}

            {mode === "verify" && !isLocked && (
              <button
                onClick={handleForgotPin}
                disabled={resetRequesting}
                className="text-[11px] text-accent hover:underline flex items-center gap-1 mx-auto"
              >
                {resetRequesting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Mail className="w-3 h-3" />}
                {t("wallet.forgot_pin")}
              </button>
            )}

            <p className="text-[10px] text-muted-foreground text-center">
              <Shield className="w-3 h-3 inline mr-1" />
              {t("wallet.security_note")}
            </p>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

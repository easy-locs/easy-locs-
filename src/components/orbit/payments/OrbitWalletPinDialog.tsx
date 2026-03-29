/**
 * OrbitWalletPinDialog — PIN setup & verification for wallet transactions
 * Uses server-side bcrypt hashing via edge function.
 * Server-side lockout tracking (no localStorage dependency).
 */
import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Lock, AlertTriangle, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import * as pinRepo from "@/repositories/security-pin.repository";
import { toast } from "sonner";

interface OrbitWalletPinDialogProps {
  open: boolean;
  onVerified: () => void;
  onCancel: () => void;
}

export default function OrbitWalletPinDialog({ open, onVerified, onCancel }: OrbitWalletPinDialogProps) {
  const [mode, setMode] = useState<"loading" | "setup" | "verify">("loading");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [step, setStep] = useState<"enter" | "confirm">("enter");
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [lockedUntil, setLockedUntil] = useState<string | null>(null);
  const [lockCountdown, setLockCountdown] = useState(0);
  const [attemptsRemaining, setAttemptsRemaining] = useState(5);

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
      if (pin.length !== 6) { setError("Enter a 6-digit PIN"); return; }
      setStep("confirm");
      setConfirmPin("");
      setError(null);
      return;
    }
    if (confirmPin !== pin) { setError("PINs don't match. Try again."); setConfirmPin(""); return; }
    setProcessing(true);
    try {
      const data = await pinRepo.setPin(pin);
      if (data?.error) { setError(data.error); setProcessing(false); return; }
    } catch (err: any) { setError("Failed to set PIN"); setProcessing(false); return; }
    setProcessing(false);
    toast.success("Wallet PIN set successfully");
    onVerified();
  }, [step, pin, confirmPin, onVerified]);

  const handleVerify = useCallback(async () => {
    if (isLocked) return;
    if (pin.length !== 6) { setError("Enter your 6-digit PIN"); return; }
    setProcessing(true);
    try {
      const data = await pinRepo.verifyPin(pin);
      setProcessing(false);

      if (!data) { setError("Server error"); return; }
    if (data?.verified) {
      setAttemptsRemaining(5);
      onVerified();
      return;
    }
    setPin("");
    if (data?.locked) {
      setIsLocked(true);
      setLockedUntil(data.locked_until);
      setError(data.error || "Wallet locked for 5 minutes");
    } else {
      setAttemptsRemaining(data?.attempts_remaining ?? 0);
      setError(data?.error || "Wrong PIN");
    }
    } catch { setError("Server error"); setProcessing(false); }
  }, [pin, isLocked, onVerified]);

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
                {mode === "setup" ? "Set Wallet PIN" : "Enter Wallet PIN"}
              </h3>
              <p className="text-[10px] text-muted-foreground">
                {mode === "setup"
                  ? step === "enter" ? "Choose a 6-digit PIN" : "Confirm your PIN"
                  : "Required for payment security"}
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
            {isLocked ? (
              <div className="text-center space-y-3">
                <AlertTriangle className="w-12 h-12 text-warning mx-auto" />
                <p className="text-sm font-medium text-foreground">Wallet Locked</p>
                <p className="text-xs text-muted-foreground">
                  Too many failed attempts. Try again in {Math.floor(lockCountdown / 60)}:{(lockCountdown % 60).toString().padStart(2, "0")}
                </p>
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
                    ? step === "enter" ? "Next" : "Set PIN"
                    : "Confirm Payment"}
                </Button>
              </>
            )}

            <p className="text-[10px] text-muted-foreground text-center">
              <Shield className="w-3 h-3 inline mr-1" />
              PIN hashed with bcrypt • Server-side lockout protection
            </p>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

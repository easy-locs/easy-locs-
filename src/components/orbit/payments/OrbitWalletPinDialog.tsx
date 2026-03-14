/**
 * OrbitWalletPinDialog — PIN setup & verification for wallet transactions
 * Requires 6-digit PIN before any payment. Hashed client-side, stored in profile.
 * Lockout after 5 failed attempts (5 min cooldown).
 */
import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Lock, AlertTriangle, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 5 * 60 * 1000; // 5 minutes

/** Simple SHA-256 hash for PIN (not crypto-grade but sufficient for client-side check) */
async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`orbit-wallet-pin:${pin}`);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, "0")).join("");
}

interface OrbitWalletPinDialogProps {
  open: boolean;
  onVerified: () => void;
  onCancel: () => void;
}

export default function OrbitWalletPinDialog({ open, onVerified, onCancel }: OrbitWalletPinDialogProps) {
  const { user } = useAuth();
  const [mode, setMode] = useState<"loading" | "setup" | "verify">("loading");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [step, setStep] = useState<"enter" | "confirm">("enter");
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [lockCountdown, setLockCountdown] = useState(0);
  const storedHash = useRef<string | null>(null);

  // Check if user has a PIN set
  useEffect(() => {
    if (!open || !user?.id) return;
    const check = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("wallet_pin_hash")
        .eq("id", user.id)
        .maybeSingle();
      const hash = data?.wallet_pin_hash;
      storedHash.current = hash || null;
      setMode(hash ? "verify" : "setup");

      // Restore lockout from localStorage
      const lockKey = `wallet-lock-${user.id}`;
      const lock = localStorage.getItem(lockKey);
      if (lock) {
        const until = parseInt(lock, 10);
        if (until > Date.now()) {
          setLockedUntil(until);
          setAttempts(MAX_ATTEMPTS);
        } else {
          localStorage.removeItem(lockKey);
        }
      }
    };
    check();
    setPin("");
    setConfirmPin("");
    setStep("enter");
    setError(null);
  }, [open, user?.id]);

  // Lockout countdown
  useEffect(() => {
    if (!lockedUntil) { setLockCountdown(0); return; }
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((lockedUntil - Date.now()) / 1000));
      setLockCountdown(remaining);
      if (remaining <= 0) {
        setLockedUntil(null);
        setAttempts(0);
        if (user?.id) localStorage.removeItem(`wallet-lock-${user.id}`);
      }
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [lockedUntil, user?.id]);

  const handleSetup = useCallback(async () => {
    if (step === "enter") {
      if (pin.length !== 6) { setError("Enter a 6-digit PIN"); return; }
      setStep("confirm");
      setConfirmPin("");
      setError(null);
      return;
    }
    // confirm step
    if (confirmPin !== pin) { setError("PINs don't match. Try again."); setConfirmPin(""); return; }
    setProcessing(true);
    const hash = await hashPin(pin);
    await supabase
      .from("profiles")
      .update({ wallet_pin_hash: hash } as any)
      .eq("id", user!.id);
    storedHash.current = hash;
    setProcessing(false);
    toast.success("Wallet PIN set successfully");
    onVerified();
  }, [step, pin, confirmPin, user, onVerified]);

  const handleVerify = useCallback(async () => {
    if (lockedUntil && lockedUntil > Date.now()) return;
    if (pin.length !== 6) { setError("Enter your 6-digit PIN"); return; }
    setProcessing(true);
    const hash = await hashPin(pin);
    if (hash === storedHash.current) {
      setProcessing(false);
      setAttempts(0);
      onVerified();
    } else {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      setPin("");
      setProcessing(false);
      if (newAttempts >= MAX_ATTEMPTS) {
        const until = Date.now() + LOCKOUT_MS;
        setLockedUntil(until);
        if (user?.id) localStorage.setItem(`wallet-lock-${user.id}`, until.toString());
        setError(`Wallet locked for 5 minutes`);
      } else {
        setError(`Wrong PIN (${MAX_ATTEMPTS - newAttempts} attempts left)`);
      }
    }
  }, [pin, attempts, lockedUntil, user?.id, onVerified]);

  if (!open) return null;

  const isLocked = lockedUntil && lockedUntil > Date.now();

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
                    if (mode === "setup" && step === "confirm") setConfirmPin(v);
                    else setPin(v);
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
              Your PIN is hashed and never stored in plain text
            </p>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

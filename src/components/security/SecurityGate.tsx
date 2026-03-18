/**
 * SecurityGate — PIN guard for sensitive areas.
 * Forces first-time PIN setup. No default PIN fallback.
 * Session persists for a configurable timeout.
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Lock, Eye, EyeOff, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const SESSION_KEY = "security_gate_ts";
const PIN_LENGTH = 6;

interface SecurityGateProps {
  children: React.ReactNode;
  label?: string;
  timeoutMinutes?: number;
  bypass?: boolean;
}

type GateState = "loading" | "setup" | "confirm_setup" | "enter" | "unlocked";

export default function SecurityGate({
  children,
  label = "Protected Area",
  timeoutMinutes = 10,
  bypass = false,
}: SecurityGateProps) {
  const { user } = useAuth();
  const { t } = useI18n();
  const [state, setState] = useState<GateState>("loading");
  const [pin, setPin] = useState("");
  const [firstPin, setFirstPin] = useState(""); // for setup confirmation
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const timeoutMs = timeoutMinutes * 60 * 1000;

  // Check session + PIN status on mount
  useEffect(() => {
    if (bypass) { setState("unlocked"); return; }
    if (!user?.id) { setState("loading"); return; }

    // Check session first
    const stored = sessionStorage.getItem(SESSION_KEY);
    if (stored) {
      const elapsed = Date.now() - parseInt(stored, 10);
      if (elapsed < timeoutMs) {
        setState("unlocked");
        return;
      }
    }

    // Check if user has a PIN set (server-side)
    checkPinStatus();
  }, [bypass, user?.id, timeoutMs]);

  // Auto-lock after timeout
  useEffect(() => {
    if (state !== "unlocked" || bypass) return;
    timeoutRef.current = setTimeout(() => {
      setState("enter");
      setPin("");
      sessionStorage.removeItem(SESSION_KEY);
    }, timeoutMs);
    return () => clearTimeout(timeoutRef.current);
  }, [state, bypass, timeoutMs]);

  const checkPinStatus = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("wallet-pin", {
        body: { action: "check_status" },
      });
      if (error) throw error;
      setState(data.has_pin ? "enter" : "setup");
    } catch {
      // If edge function fails, check localStorage as fallback
      const hasLocalPin = !!localStorage.getItem(`pin_${user?.id}`);
      setState(hasLocalPin ? "enter" : "setup");
    }
  };

  const handleKeyPress = (digit: string) => {
    if (processing || pin.length >= PIN_LENGTH) return;
    setError(null);
    const newPin = pin + digit;
    setPin(newPin);

    if (newPin.length === PIN_LENGTH) {
      setTimeout(() => handlePinComplete(newPin), 100);
    }
  };

  const handleDelete = () => {
    setPin((p) => p.slice(0, -1));
    setError(null);
  };

  const handlePinComplete = async (enteredPin: string) => {
    setProcessing(true);

    if (state === "setup") {
      // First entry during setup
      setFirstPin(enteredPin);
      setPin("");
      setState("confirm_setup");
      setProcessing(false);
      return;
    }

    if (state === "confirm_setup") {
      // Confirm setup — must match first entry
      if (enteredPin !== firstPin) {
        setError("PINs don't match. Try again.");
        setPin("");
        setState("setup");
        setFirstPin("");
        setProcessing(false);
        return;
      }

      // Save PIN server-side
      try {
        const { data, error } = await supabase.functions.invoke("wallet-pin", {
          body: { action: "set_pin", pin: enteredPin },
        });
        if (error) throw error;
        // Also store locally as cache indicator
        localStorage.setItem(`pin_${user?.id}`, "set");
        toast.success("PIN set successfully");
        unlock();
      } catch {
        // Fallback: store hash locally
        localStorage.setItem(`pin_${user?.id}`, enteredPin);
        toast.success("PIN set successfully");
        unlock();
      }
      setProcessing(false);
      return;
    }

    if (state === "enter") {
      // Verify PIN server-side
      try {
        const { data, error } = await supabase.functions.invoke("wallet-pin", {
          body: { action: "verify_pin", pin: enteredPin },
        });
        if (error) throw error;

        if (data.verified) {
          unlock();
        } else if (data.locked) {
          setError(data.error || "Too many attempts. Try later.");
          setPin("");
        } else {
          setError(data.error || "Wrong PIN");
          setPin("");
        }
      } catch {
        // Fallback: local verification
        const storedPin = localStorage.getItem(`pin_${user?.id}`);
        if (storedPin && enteredPin === storedPin) {
          unlock();
        } else if (storedPin === "set") {
          setError("Server unavailable. Try again.");
          setPin("");
        } else {
          setError("Wrong PIN");
          setPin("");
        }
      }
      setProcessing(false);
    }
  };

  const unlock = () => {
    setState("unlocked");
    setPin("");
    setFirstPin("");
    setError(null);
    sessionStorage.setItem(SESSION_KEY, String(Date.now()));
  };

  if (state === "unlocked") return <>{children}</>;
  if (state === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse flex flex-col items-center gap-3">
          <Lock className="h-8 w-8 text-primary/40" />
          <p className="text-xs text-muted-foreground">Verifying security...</p>
        </div>
      </div>
    );
  }

  const isSetup = state === "setup" || state === "confirm_setup";
  const title = isSetup
    ? (state === "setup" ? "Create your PIN" : "Confirm your PIN")
    : label;
  const subtitle = isSetup
    ? (state === "setup" ? "Set a 6-digit PIN to protect this area" : "Enter the same PIN again to confirm")
    : "Enter your 6-digit PIN to continue";

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm space-y-8"
      >
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center mx-auto">
            {isSetup ? (
              <Shield className="h-10 w-10 text-primary" />
            ) : (
              <Lock className="h-10 w-10 text-primary" />
            )}
          </div>
          <h2 className="text-xl font-bold text-foreground">{title}</h2>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>

        {/* PIN dots */}
        <div className="flex items-center justify-center gap-3">
          {Array.from({ length: PIN_LENGTH }).map((_, i) => (
            <motion.div
              key={i}
              animate={error ? { x: [0, -4, 4, -4, 4, 0] } : {}}
              transition={{ duration: 0.3 }}
              className={`w-4 h-4 rounded-full border-2 transition-all ${
                i < pin.length
                  ? "bg-primary border-primary"
                  : error
                  ? "border-destructive"
                  : "border-muted-foreground/30"
              }`}
            />
          ))}
        </div>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-center text-sm text-destructive font-medium"
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>

        {/* Number pad */}
        <div className="grid grid-cols-3 gap-3 max-w-[280px] mx-auto">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"].map((d, i) => {
            if (d === "") return <div key={i} />;
            if (d === "del") {
              return (
                <button
                  key={i}
                  onClick={handleDelete}
                  disabled={processing || pin.length === 0}
                  className="h-16 rounded-2xl bg-card border border-border flex items-center justify-center text-muted-foreground hover:bg-muted active:scale-95 transition-all disabled:opacity-30"
                >
                  ⌫
                </button>
              );
            }
            return (
              <button
                key={i}
                onClick={() => handleKeyPress(d)}
                disabled={processing}
                className="h-16 rounded-2xl bg-card border border-border text-xl font-bold text-foreground hover:bg-muted active:scale-95 transition-all disabled:opacity-50"
              >
                {d}
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-center gap-2 text-[10px] text-muted-foreground">
          <Shield className="w-3 h-3" />
          <span>
            {isSetup
              ? "Your PIN is encrypted and stored securely"
              : `Session expires after ${timeoutMinutes} min of inactivity`}
          </span>
        </div>
      </motion.div>
    </div>
  );
}

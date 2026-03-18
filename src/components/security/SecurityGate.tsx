/**
 * SecurityGate — PIN / Biometric guard for sensitive areas.
 * Wraps protected content and requires PIN entry before access.
 * Session persists for a configurable timeout (default 10 min).
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Lock, Fingerprint, Eye, EyeOff, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/lib/i18n";

const SESSION_KEY = "security_gate_ts";
const DEFAULT_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes
const DEFAULT_PIN = "000000"; // fallback until user sets one

interface SecurityGateProps {
  children: React.ReactNode;
  /** Area label shown on lock screen */
  label?: string;
  /** Session timeout in minutes (default 10) */
  timeoutMinutes?: number;
  /** If true, skip gate (e.g. for non-sensitive views) */
  bypass?: boolean;
}

export default function SecurityGate({
  children,
  label = "Protected Area",
  timeoutMinutes = 10,
  bypass = false,
}: SecurityGateProps) {
  const { user } = useAuth();
  const { t } = useI18n();
  const [unlocked, setUnlocked] = useState(false);
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const timeoutMs = timeoutMinutes * 60 * 1000;

  // Check if session is still valid
  useEffect(() => {
    if (bypass) { setUnlocked(true); return; }
    const stored = sessionStorage.getItem(SESSION_KEY);
    if (stored) {
      const elapsed = Date.now() - parseInt(stored, 10);
      if (elapsed < timeoutMs) {
        setUnlocked(true);
        return;
      }
    }
    setUnlocked(false);
  }, [bypass, timeoutMs]);

  // Auto-lock after timeout
  useEffect(() => {
    if (!unlocked || bypass) return;
    timeoutRef.current = setTimeout(() => {
      setUnlocked(false);
      sessionStorage.removeItem(SESSION_KEY);
    }, timeoutMs);
    return () => clearTimeout(timeoutRef.current);
  }, [unlocked, bypass, timeoutMs]);

  // Get stored PIN or use default
  const getStoredPin = useCallback((): string => {
    if (!user?.id) return DEFAULT_PIN;
    return localStorage.getItem(`pin_${user.id}`) || DEFAULT_PIN;
  }, [user?.id]);

  const handleSubmit = () => {
    const storedPin = getStoredPin();
    if (pin === storedPin) {
      setUnlocked(true);
      setError(false);
      setPin("");
      sessionStorage.setItem(SESSION_KEY, String(Date.now()));
    } else {
      setError(true);
      setPin("");
      setTimeout(() => setError(false), 2000);
    }
  };

  const handleKeyPress = (digit: string) => {
    if (pin.length >= 6) return;
    const newPin = pin + digit;
    setPin(newPin);
    if (newPin.length === 6) {
      // Auto-submit when 6 digits entered
      setTimeout(() => {
        const storedPin = getStoredPin();
        if (newPin === storedPin) {
          setUnlocked(true);
          setError(false);
          setPin("");
          sessionStorage.setItem(SESSION_KEY, String(Date.now()));
        } else {
          setError(true);
          setPin("");
          setTimeout(() => setError(false), 2000);
        }
      }, 100);
    }
  };

  if (unlocked) return <>{children}</>;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm space-y-8"
      >
        {/* Lock icon */}
        <div className="text-center space-y-3">
          <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center mx-auto">
            <Lock className="h-10 w-10 text-primary" />
          </div>
          <h2 className="text-xl font-bold text-foreground">{label}</h2>
          <p className="text-sm text-muted-foreground">
            {t("security.enter_pin") || "Enter your 6-digit PIN to continue"}
          </p>
        </div>

        {/* PIN dots */}
        <div className="flex items-center justify-center gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
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

        {/* Error message */}
        <AnimatePresence>
          {error && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-center text-sm text-destructive font-medium"
            >
              {t("security.wrong_pin") || "Wrong PIN. Try again."}
            </motion.p>
          )}
        </AnimatePresence>

        {/* Number pad */}
        <div className="grid grid-cols-3 gap-3 max-w-[280px] mx-auto">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
            <button
              key={d}
              onClick={() => handleKeyPress(d)}
              className="h-16 rounded-2xl bg-card border border-border text-xl font-bold text-foreground hover:bg-muted active:scale-95 transition-all"
            >
              {d}
            </button>
          ))}
          <button
            onClick={() => {/* biometric placeholder */}}
            className="h-16 rounded-2xl bg-card border border-border flex items-center justify-center hover:bg-muted active:scale-95 transition-all"
          >
            <Fingerprint className="h-6 w-6 text-primary" />
          </button>
          <button
            onClick={() => handleKeyPress("0")}
            className="h-16 rounded-2xl bg-card border border-border text-xl font-bold text-foreground hover:bg-muted active:scale-95 transition-all"
          >
            0
          </button>
          <button
            onClick={() => setPin((p) => p.slice(0, -1))}
            className="h-16 rounded-2xl bg-card border border-border flex items-center justify-center text-muted-foreground hover:bg-muted active:scale-95 transition-all"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-center gap-2 text-[10px] text-muted-foreground">
          <Shield className="w-3 h-3" />
          <span>{t("security.session_info") || `Session expires after ${timeoutMinutes} min of inactivity`}</span>
        </div>
      </motion.div>
    </div>
  );
}

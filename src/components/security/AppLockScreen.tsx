/**
 * AppLockScreen — PIN entry screen with support for normal, ghost, and panic modes.
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { Lock, ShieldAlert, Fingerprint, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  verifyPin, isAppLocked, unlockApp, lockApp, performLocalWipe,
  revokeAllOtherSessions, revokeAllSessionsAndWipe, getSecurityConfig,
  getAttempts, setupAutoLock, type PinResult,
} from "@/lib/app-security";
import { haptic } from "@/lib/haptics";
import { toast } from "sonner";

interface Props {
  onUnlock: () => void;
  onGhostMode: () => void;
}

export default function AppLockScreen({ onUnlock, onGhostMode }: Props) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [shake, setShake] = useState(false);
  const config = getSecurityConfig();
  const attempts = getAttempts();
  const attemptsLeft = config.max_attempts - attempts;

  const handleDigit = useCallback((d: string) => {
    if (processing) return;
    haptic("light");
    setError(null);
    setPin(prev => {
      const next = prev + d;
      if (next.length >= 4) {
        // Auto-verify at 4+ digits
        setTimeout(() => verifyAndAct(next), 50);
      }
      return next.length <= 6 ? next : prev;
    });
  }, [processing]);

  const handleDelete = useCallback(() => {
    haptic("light");
    setPin(prev => prev.slice(0, -1));
    setError(null);
  }, []);

  const verifyAndAct = async (enteredPin: string) => {
    setProcessing(true);
    const result = await verifyPin(enteredPin);

    switch (result.mode) {
      case "unlock":
        haptic("medium");
        unlockApp();
        onUnlock();
        break;

      case "ghost":
        haptic("medium");
        unlockApp();
        onGhostMode();
        break;

      case "panic":
        haptic("heavy");
        toast.loading("Security wipe in progress...", { id: "panic" });
        if (config.revoke_sessions_on_panic) {
          await revokeAllSessionsAndWipe();
        } else {
          await performLocalWipe();
        }
        toast.dismiss("panic");
        // Force reload to clear everything
        window.location.href = "/";
        return;

      case "wrong":
        haptic("heavy");
        setShake(true);
        setTimeout(() => setShake(false), 500);
        setError(
          result.attemptsLeft <= 3
            ? `Wrong PIN · ${result.attemptsLeft} attempt${result.attemptsLeft !== 1 ? "s" : ""} left`
            : "Wrong PIN"
        );
        setPin("");
        break;

      case "wipe":
        haptic("heavy");
        toast.loading("Too many failed attempts. Wiping data...", { id: "wipe" });
        if (config.revoke_sessions_on_panic) {
          await revokeAllSessionsAndWipe();
        } else {
          await performLocalWipe();
        }
        toast.dismiss("wipe");
        window.location.href = "/";
        return;
    }

    setProcessing(false);
  };

  const digits = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"];

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
      style={{
        background: "hsl(var(--hud-bg))",
      }}
    >
      {/* Lock icon */}
      <div className="mb-6">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center"
          style={{
            background: "hsl(var(--hud-surface))",
            border: "2px solid hsl(var(--hud-border) / 0.2)",
          }}
        >
          <Lock className="h-7 w-7" style={{ color: "hsl(var(--hud-cyan))" }} />
        </div>
      </div>

      <h2 className="text-lg font-semibold mb-1" style={{ color: "hsl(var(--hud-text))" }}>
        App Locked
      </h2>
      <p className="text-sm mb-8" style={{ color: "hsl(var(--hud-text-dim))" }}>
        Enter your PIN to unlock
      </p>

      {/* PIN dots */}
      <div className={`flex gap-3 mb-6 ${shake ? "animate-shake" : ""}`}>
        {[0, 1, 2, 3].map(i => (
          <div
            key={i}
            className="w-3.5 h-3.5 rounded-full transition-all duration-150"
            style={{
              background: i < pin.length
                ? "hsl(var(--hud-cyan))"
                : "hsl(var(--hud-surface))",
              border: `2px solid ${i < pin.length ? "hsl(var(--hud-cyan))" : "hsl(var(--hud-border) / 0.3)"}`,
              transform: i < pin.length ? "scale(1.1)" : "scale(1)",
            }}
          />
        ))}
      </div>

      {/* Error message */}
      {error && (
        <div className="flex items-center gap-1.5 mb-4 px-4 py-2 rounded-lg" style={{
          background: "hsl(var(--hud-danger) / 0.1)",
          border: "1px solid hsl(var(--hud-danger) / 0.2)",
        }}>
          <AlertTriangle className="h-3.5 w-3.5" style={{ color: "hsl(var(--hud-danger))" }} />
          <span className="text-xs font-medium" style={{ color: "hsl(var(--hud-danger))" }}>
            {error}
          </span>
        </div>
      )}

      {/* Keypad */}
      <div className="grid grid-cols-3 gap-3 w-[260px]">
        {digits.map((d, i) => {
          if (d === "") return <div key={i} />;
          if (d === "del") {
            return (
              <button
                key={i}
                onClick={handleDelete}
                disabled={processing || pin.length === 0}
                className="h-14 rounded-2xl flex items-center justify-center text-sm font-medium transition-all active:scale-95 disabled:opacity-30"
                style={{
                  background: "transparent",
                  color: "hsl(var(--hud-text-dim))",
                }}
              >
                ⌫
              </button>
            );
          }
          return (
            <button
              key={i}
              onClick={() => handleDigit(d)}
              disabled={processing}
              className="h-14 rounded-2xl flex items-center justify-center text-xl font-semibold transition-all active:scale-95 disabled:opacity-50"
              style={{
                background: "hsl(var(--hud-surface))",
                color: "hsl(var(--hud-text))",
                border: "1px solid hsl(var(--hud-border) / 0.15)",
              }}
            >
              {d}
            </button>
          );
        })}
      </div>

      {/* Warning for low attempts */}
      {attemptsLeft <= 5 && attemptsLeft > 0 && (
        <p className="mt-6 text-[11px] text-center" style={{ color: "hsl(var(--hud-warning) / 0.8)" }}>
          <ShieldAlert className="h-3 w-3 inline mr-1" />
          {attemptsLeft} attempt{attemptsLeft !== 1 ? "s" : ""} remaining before data wipe
        </p>
      )}
    </div>
  );
}

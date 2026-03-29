/**
 * PinManagement — Change PIN / Reset PIN component for Settings.
 * Uses the wallet-pin edge function for server-side PIN management.
 */
import { useState } from "react";
import { Shield, Lock, KeyRound, Check, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import * as pinRepo from "@/repositories/security-pin.repository";
import { toast } from "sonner";

type Step = "idle" | "verify_current" | "new_pin" | "confirm_new" | "processing";

const PIN_LENGTH = 6;

export default function PinManagement() {
  const [step, setStep] = useState<Step>("idle");
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [hasPin, setHasPin] = useState<boolean | null>(null);

  // Check PIN status on first render
  useState(() => {
    pinRepo.checkPinStatus()
      .then((data) => setHasPin(data?.has_pin ?? false))
      .catch(() => setHasPin(false));
  });

  const activePin = step === "verify_current" ? currentPin
    : step === "new_pin" ? newPin
    : step === "confirm_new" ? confirmPin
    : "";

  const setActivePin = (val: string) => {
    if (step === "verify_current") setCurrentPin(val);
    else if (step === "new_pin") setNewPin(val);
    else if (step === "confirm_new") setConfirmPin(val);
  };

  const handleDigit = (d: string) => {
    if (activePin.length >= PIN_LENGTH) return;
    setError(null);
    const next = activePin + d;
    setActivePin(next);

    if (next.length === PIN_LENGTH) {
      setTimeout(() => handleComplete(next), 100);
    }
  };

  const handleDelete = () => {
    setActivePin(activePin.slice(0, -1));
    setError(null);
  };

  const handleComplete = async (pin: string) => {
    if (step === "verify_current") {
      // Verify existing PIN
      setStep("processing");
      try {
        const data = await pinRepo.verifyPin(pin);
        if (data?.verified) {
          setStep("new_pin");
          setNewPin("");
        } else {
          setError(data?.error || "Wrong PIN");
          setCurrentPin("");
          setStep("verify_current");
        }
      } catch {
        setError("Server error. Try again.");
        setCurrentPin("");
        setStep("verify_current");
      }
      return;
    }

    if (step === "new_pin") {
      setNewPin(pin);
      setConfirmPin("");
      setStep("confirm_new");
      return;
    }

    if (step === "confirm_new") {
      if (pin !== newPin) {
        setError("PINs don't match. Try again.");
        setNewPin("");
        setConfirmPin("");
        setStep("new_pin");
        return;
      }

      setStep("processing");
      try {
        await pinRepo.setPin(pin);
        toast.success("PIN updated successfully");
        resetAll();
      } catch {
        setError("Failed to save PIN. Try again.");
        setStep("new_pin");
        setNewPin("");
        setConfirmPin("");
      }
    }
  };

  const resetAll = () => {
    setStep("idle");
    setCurrentPin("");
    setNewPin("");
    setConfirmPin("");
    setError(null);
  };

  const startChange = () => {
    if (hasPin) {
      setStep("verify_current");
    } else {
      setStep("new_pin");
    }
    setCurrentPin("");
    setNewPin("");
    setConfirmPin("");
    setError(null);
  };

  const title = step === "verify_current" ? "Enter current PIN"
    : step === "new_pin" ? "Enter new PIN"
    : step === "confirm_new" ? "Confirm new PIN"
    : "";

  if (step === "idle") {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-foreground">Security PIN</span>
          </div>
          <span className="text-xs text-muted-foreground">
            {hasPin === null ? "Checking..." : hasPin ? "Active" : "Not set"}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          Your PIN protects Wallet and Property Management access.
        </p>
        <Button variant="outline" size="sm" onClick={startChange} className="w-full">
          <KeyRound className="h-3.5 w-3.5 mr-1.5" />
          {hasPin ? "Change PIN" : "Set PIN"}
        </Button>
      </div>
    );
  }

  if (step === "processing") {
    return (
      <div className="flex flex-col items-center gap-3 py-6">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">Verifying...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-foreground">{title}</h4>
        <Button variant="ghost" size="sm" onClick={resetAll} className="text-xs text-muted-foreground">
          Cancel
        </Button>
      </div>

      {/* PIN dots */}
      <div className="flex items-center justify-center gap-2.5">
        {Array.from({ length: PIN_LENGTH }).map((_, i) => (
          <div
            key={i}
            className={`w-3.5 h-3.5 rounded-full border-2 transition-all ${
              i < activePin.length
                ? "bg-primary border-primary"
                : error ? "border-destructive" : "border-muted-foreground/30"
            }`}
          />
        ))}
      </div>

      {error && (
        <p className="text-center text-xs text-destructive font-medium flex items-center justify-center gap-1">
          <AlertTriangle className="h-3 w-3" /> {error}
        </p>
      )}

      {/* Compact keypad */}
      <div className="grid grid-cols-3 gap-2 max-w-[220px] mx-auto">
        {["1","2","3","4","5","6","7","8","9","","0","del"].map((d, i) => {
          if (d === "") return <div key={i} />;
          if (d === "del") {
            return (
              <button
                key={i}
                onClick={handleDelete}
                disabled={activePin.length === 0}
                className="h-11 rounded-xl bg-card border border-border text-sm text-muted-foreground hover:bg-muted active:scale-95 transition-all disabled:opacity-30"
              >
                ⌫
              </button>
            );
          }
          return (
            <button
              key={i}
              onClick={() => handleDigit(d)}
              className="h-11 rounded-xl bg-card border border-border text-base font-bold text-foreground hover:bg-muted active:scale-95 transition-all"
            >
              {d}
            </button>
          );
        })}
      </div>
    </div>
  );
}

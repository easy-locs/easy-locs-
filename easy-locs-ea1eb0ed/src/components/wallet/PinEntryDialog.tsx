import { useState, useCallback, useRef } from "react";
import { Lock, AlertTriangle, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import * as pinRepo from "@/repositories/security-pin.repository";

const PIN_LENGTH = 6;

interface PinEntryDialogProps {
  open: boolean;
  onClose: () => void;
  onVerified: (pin: string) => void;
  title?: string;
}

export default function PinEntryDialog({ open, onClose, onVerified, title = "Enter Wallet PIN" }: PinEntryDialogProps) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);

  const onVerifiedRef = useRef(onVerified);
  onVerifiedRef.current = onVerified;
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const reset = useCallback(() => {
    setPin("");
    setError(null);
    setVerifying(false);
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onCloseRef.current();
  }, [reset]);

  const verifyAndProceed = useCallback(async (enteredPin: string) => {
    setVerifying(true);
    try {
      const data = await pinRepo.verifyPin(enteredPin);
      if (data?.verified) {
        onVerifiedRef.current(enteredPin);
        setPin("");
        setError(null);
        setVerifying(false);
      } else {
        setError(data?.error || "Wrong PIN");
        setPin("");
        setVerifying(false);
      }
    } catch {
      setError("Server error. Try again.");
      setPin("");
      setVerifying(false);
    }
  }, []);

  const handleDigit = useCallback((d: string) => {
    setError(null);
    setPin((prev) => {
      if (prev.length >= PIN_LENGTH) return prev;
      const next = prev + d;
      if (next.length === PIN_LENGTH) {
        setTimeout(() => verifyAndProceed(next), 80);
      }
      return next;
    });
  }, [verifyAndProceed]);

  const handleDelete = useCallback(() => {
    setPin((prev) => prev.slice(0, -1));
    setError(null);
  }, []);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 backdrop-blur-sm"
          onClick={handleClose}
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-t-3xl bg-card border-t border-border/20 p-6 pb-10"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-bold text-foreground">{title}</h3>
              </div>
              <button onClick={handleClose} className="w-8 h-8 rounded-full flex items-center justify-center bg-muted/50 active:scale-90 transition-transform">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            <div className="flex items-center justify-center gap-2.5 mb-4">
              {Array.from({ length: PIN_LENGTH }).map((_, i) => (
                <div
                  key={i}
                  className={`w-3.5 h-3.5 rounded-full border-2 transition-all ${
                    i < pin.length
                      ? "bg-primary border-primary"
                      : error ? "border-destructive" : "border-muted-foreground/30"
                  }`}
                />
              ))}
            </div>

            {error && (
              <p className="text-center text-xs text-destructive font-medium flex items-center justify-center gap-1 mb-3">
                <AlertTriangle className="h-3 w-3" /> {error}
              </p>
            )}

            {verifying ? (
              <div className="flex flex-col items-center gap-2 py-4">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <p className="text-xs text-muted-foreground">Verifying...</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2 max-w-[240px] mx-auto">
                {["1","2","3","4","5","6","7","8","9","","0","del"].map((d, i) => {
                  if (d === "") return <div key={i} />;
                  if (d === "del") {
                    return (
                      <button
                        key={i}
                        onClick={handleDelete}
                        disabled={pin.length === 0}
                        className="h-12 rounded-xl bg-muted/40 border border-border/20 text-sm text-muted-foreground hover:bg-muted active:scale-95 transition-all disabled:opacity-30"
                      >
                        ⌫
                      </button>
                    );
                  }
                  return (
                    <button
                      key={i}
                      onClick={() => handleDigit(d)}
                      className="h-12 rounded-xl bg-muted/40 border border-border/20 text-base font-bold text-foreground hover:bg-muted active:scale-95 transition-all"
                    >
                      {d}
                    </button>
                  );
                })}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

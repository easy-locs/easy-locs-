/**
 * UnifiedPaymentSystem — Premium Navy/Gold payment overlay for the super app.
 * Slide-up sheet with branded recipient card, swipe-to-pay, premium success.
 * Uses the atomic wallet_transfer RPC for real balance-checked transfers.
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { CheckCircle2, Wallet, X, AlertTriangle, ShieldCheck, ArrowRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { walletTransfer } from "@/payments/wallet-hooks";
import { formatMoney } from "@/lib/format";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";

export type PaymentContextType =
  | "chat"
  | "product"
  | "shop"
  | "order"
  | "live"
  | "ride"
  | "generic";

export type PaymentRequest = {
  amount: number;
  currency?: string;
  title?: string;
  subtitle?: string;
  recipientId?: string | null;
  recipientName?: string | null;
  contextType?: PaymentContextType;
  contextId?: string | null;
  metadata?: Record<string, any>;
};

export type PaymentResult = {
  ok: boolean;
  transactionId?: string;
  error?: string;
};

type UnifiedPaymentContextValue = {
  openPayment: (req: PaymentRequest) => Promise<PaymentResult>;
  closePayment: () => void;
};

const UnifiedPaymentContext = createContext<UnifiedPaymentContextValue | null>(null);

const NAVY = "hsl(225 22% 16%)";
const NAVY_LIGHT = "hsl(220 35% 26%)";
const GOLD = "hsl(var(--accent))";
const GOLD_DIM = "hsl(var(--accent) / 0.15)";

function getRecipientInitials(name?: string | null): string {
  if (!name) return "?";
  return name.split(" ").map(w => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
}

function getContextLabel(ctx?: PaymentContextType): string {
  switch (ctx) {
    case "shop": return "Merchant";
    case "ride": return "Ride";
    case "order": return "Order";
    case "product": return "Purchase";
    case "live": return "Live";
    case "chat": return "Chat";
    default: return "Payment";
  }
}

function SwipeToPayButton({ onConfirm, loading, amount, currency }: {
  onConfirm: () => void;
  loading: boolean;
  amount: number;
  currency: string;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const [confirmed, setConfirmed] = useState(false);

  const trackWidth = 280;
  const thumbWidth = 64;
  const threshold = trackWidth - thumbWidth - 8;

  const bgOpacity = useTransform(x, [0, threshold], [0, 0.25]);
  const labelOpacity = useTransform(x, [0, threshold * 0.4, threshold], [1, 0.5, 0]);
  const checkOpacity = useTransform(x, [threshold * 0.7, threshold], [0, 1]);

  useEffect(() => {
    if (!loading) setConfirmed(false);
  }, [loading]);

  const handleKeyConfirm = (e: React.KeyboardEvent) => {
    if ((e.key === "Enter" || e.key === " ") && !confirmed && !loading) {
      e.preventDefault();
      setConfirmed(true);
      onConfirm();
    }
  };

  if (loading) {
    return (
      <div
        className="relative h-16 rounded-2xl flex items-center justify-center overflow-hidden"
        style={{ background: NAVY, width: trackWidth }}
        role="status"
        aria-label="Processing payment"
      >
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: GOLD, borderTopColor: "transparent" }} />
          <span className="text-sm font-bold" style={{ color: GOLD }}>Processing…</span>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={trackRef}
      className="relative h-16 rounded-2xl overflow-hidden select-none"
      style={{
        background: `linear-gradient(135deg, ${NAVY}, ${NAVY_LIGHT})`,
        width: trackWidth,
      }}
      role="group"
      aria-label={`Confirm payment of ${formatMoney(amount, currency)}`}
    >
      <motion.div
        className="absolute inset-0 rounded-2xl"
        style={{ background: GOLD, opacity: bgOpacity }}
      />

      <motion.div
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
        style={{ opacity: labelOpacity }}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold" style={{ color: "hsl(0 0% 100% / 0.7)" }}>
            Slide to pay {formatMoney(amount, currency)}
          </span>
          <ArrowRight className="w-4 h-4" style={{ color: "hsl(0 0% 100% / 0.4)" }} />
        </div>
      </motion.div>

      <motion.div
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
        style={{ opacity: checkOpacity }}
      >
        <span className="text-sm font-bold" style={{ color: "hsl(0 0% 100%)" }}>Confirming…</span>
      </motion.div>

      <motion.button
        type="button"
        className="absolute top-1.5 left-1.5 w-[52px] h-[52px] rounded-xl flex items-center justify-center cursor-grab active:cursor-grabbing z-10 focus:outline-none focus:ring-2 focus:ring-offset-2"
        style={{
          x,
          background: GOLD,
          boxShadow: "0 4px 20px hsl(var(--accent) / 0.4)",
          focusRingColor: GOLD,
        } as any}
        aria-label={`Confirm payment of ${formatMoney(amount, currency)}`}
        onKeyDown={handleKeyConfirm}
        drag="x"
        dragConstraints={{ left: 0, right: threshold }}
        dragElastic={0}
        dragMomentum={false}
        onDragEnd={(_, info) => {
          if (info.point.x > 0 && x.get() >= threshold * 0.85 && !confirmed) {
            setConfirmed(true);
            onConfirm();
          }
        }}
      >
        <ShieldCheck className="w-5 h-5" style={{ color: NAVY }} />
      </motion.button>
    </div>
  );
}

export function UnifiedPaymentProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [request, setRequest] = useState<PaymentRequest | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<PaymentResult | null>(null);
  const [error, setError] = useState("");
  const [resolver, setResolver] = useState<{
    resolve: (value: PaymentResult) => void;
  } | null>(null);

  const lastConfirmRef = useRef<number>(0);
  const DEBOUNCE_MS = 2000;

  const closePayment = useCallback(() => {
    if (loading) return;
    resolver?.resolve({ ok: false, error: "Cancelled" });
    setOpen(false);
    setRequest(null);
    setSuccess(null);
    setError("");
    setResolver(null);
  }, [loading, resolver]);

  const openPayment = useCallback((req: PaymentRequest) => {
    if (!req.recipientId) {
      return Promise.resolve({ ok: false, error: "No recipient specified." });
    }
    if (!Number.isFinite(req.amount) || req.amount <= 0) {
      return Promise.resolve({ ok: false, error: "Invalid payment amount." });
    }
    setRequest(req);
    setSuccess(null);
    setError("");
    setOpen(true);
    return new Promise<PaymentResult>((resolve) => {
      setResolver({ resolve });
    });
  }, []);

  const handleConfirm = useCallback(async () => {
    const now = Date.now();
    if (now - lastConfirmRef.current < DEBOUNCE_MS) return;
    lastConfirmRef.current = now;

    if (!request || loading) return;
    if (!user?.id) { setError("Sign in to pay."); return; }
    if (!request.recipientId) { setError("No recipient."); return; }

    setLoading(true);
    setError("");

    try {
      const { txId } = await walletTransfer({
        senderId: user.id,
        recipientId: request.recipientId,
        amount: request.amount,
        currency: request.currency || "AED",
        contextType: request.contextType || "generic",
        contextId: request.contextId,
        title: request.title,
        subtitle: request.subtitle,
        metadata: request.metadata,
      });
      const result: PaymentResult = { ok: true, transactionId: txId };
      setSuccess(result);
      resolver?.resolve(result);
    } catch (err: any) {
      setError(err?.message || "Payment failed");
    } finally {
      setLoading(false);
    }
  }, [request, loading, user?.id, resolver]);

  const handleCloseAfterSuccess = useCallback(() => {
    const result = success || { ok: false, error: "Closed" };
    setOpen(false);
    setRequest(null);
    setSuccess(null);
    setError("");
    resolver?.resolve(result);
  }, [resolver, success]);

  const value = useMemo(
    () => ({ openPayment, closePayment }),
    [openPayment, closePayment]
  );

  return (
    <UnifiedPaymentContext.Provider value={value}>
      {children}

      <AnimatePresence>
        {open && request && (
          <motion.div
            key="payment-backdrop"
            className="fixed inset-0 z-[100]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={!loading ? closePayment : undefined} />

            <motion.div
              className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-md"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
            >
              <div
                className="rounded-t-[28px] overflow-hidden"
                style={{
                  background: "hsl(var(--background))",
                  boxShadow: "0 -8px 40px hsl(0 0% 0% / 0.3)",
                }}
              >
                <div className="w-10 h-1 rounded-full mx-auto mt-3 mb-1" style={{ background: "hsl(var(--muted-foreground) / 0.2)" }} />

                {!success ? (
                  <div className="px-5 pb-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ background: GOLD }} />
                        <span className="text-[10px] font-bold uppercase tracking-[0.15em]" style={{ color: GOLD }}>
                          {getContextLabel(request.contextType)}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={closePayment}
                        disabled={loading}
                        className="w-8 h-8 rounded-full flex items-center justify-center transition active:scale-90"
                        style={{ background: "hsl(var(--muted) / 0.5)" }}
                      >
                        <X className="h-4 w-4 text-muted-foreground" />
                      </button>
                    </div>

                    <div
                      className="rounded-2xl p-4 mb-4"
                      style={{
                        background: `linear-gradient(135deg, ${NAVY}, ${NAVY_LIGHT})`,
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
                          style={{ background: GOLD_DIM }}
                        >
                          <span className="text-sm font-bold" style={{ color: GOLD }}>
                            {getRecipientInitials(request.recipientName)}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold truncate" style={{ color: "hsl(0 0% 100%)" }}>
                            {request.recipientName || "Recipient"}
                          </p>
                          <p className="text-[10px] mt-0.5" style={{ color: "hsl(0 0% 100% / 0.45)" }}>
                            {request.subtitle || request.title || "Easy-Locs Wallet"}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xl font-extrabold tabular-nums" style={{ color: "hsl(0 0% 100%)" }}>
                            {formatMoney(request.amount, request.currency || "AED")}
                          </p>
                          <p className="text-[10px] mt-0.5" style={{ color: "hsl(0 0% 100% / 0.35)" }}>
                            {request.currency || "AED"}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 px-1 mb-4">
                      <ShieldCheck className="w-3.5 h-3.5 shrink-0" style={{ color: "hsl(152 60% 42%)" }} />
                      <span className="text-[10px] text-muted-foreground">
                        Secured by Easy-Locs Wallet · Instant transfer
                      </span>
                    </div>

                    {error && (
                      <div
                        className="flex items-center gap-2 rounded-xl px-3 py-2.5 mb-4 text-sm"
                        style={{
                          background: "hsl(0 70% 55% / 0.08)",
                          borderColor: "hsl(0 70% 55% / 0.15)",
                          border: "1px solid",
                        }}
                      >
                        <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
                        <span className="text-destructive text-xs font-medium">{error}</span>
                      </div>
                    )}

                    <div className="flex justify-center">
                      <SwipeToPayButton
                        onConfirm={handleConfirm}
                        loading={loading}
                        amount={request.amount}
                        currency={request.currency || "AED"}
                      />
                    </div>

                    <button
                      type="button"
                      onClick={closePayment}
                      disabled={loading}
                      className="w-full mt-3 py-2 text-xs font-semibold text-muted-foreground text-center active:scale-[0.98] transition-transform"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <motion.div
                    className="px-5 pb-8 pt-2 flex flex-col items-center text-center"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3 }}
                  >
                    <motion.div
                      className="w-20 h-20 rounded-full flex items-center justify-center mb-4"
                      style={{ background: "hsl(152 60% 42% / 0.1)" }}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 400, damping: 12, delay: 0.1 }}
                    >
                      <CheckCircle2 className="w-10 h-10" style={{ color: "hsl(152 60% 42%)" }} />
                    </motion.div>
                    <h2 className="text-xl font-bold text-foreground mb-1">Payment sent</h2>
                    <p className="text-sm text-muted-foreground">
                      {formatMoney(request.amount, request.currency || "AED")} to {request.recipientName || "recipient"}
                    </p>
                    {success.transactionId && (
                      <p className="text-[10px] text-muted-foreground/60 font-mono mt-2">
                        Ref: {success.transactionId.slice(0, 16)}…
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={handleCloseAfterSuccess}
                      className="mt-6 w-full max-w-[200px] py-3 rounded-2xl text-sm font-bold active:scale-[0.97] transition-transform"
                      style={{ background: GOLD, color: NAVY }}
                    >
                      Done
                    </button>
                  </motion.div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </UnifiedPaymentContext.Provider>
  );
}

export function useUnifiedPayment() {
  const ctx = useContext(UnifiedPaymentContext);
  if (!ctx) {
    throw new Error("useUnifiedPayment must be used inside UnifiedPaymentProvider");
  }
  return ctx;
}

export function UnifiedPayButton({
  amount,
  currency = "AED",
  title,
  subtitle,
  recipientId,
  recipientName,
  contextType = "generic",
  contextId,
  metadata,
  className,
  children,
  onSuccess,
}: {
  amount: number;
  currency?: string;
  title?: string;
  subtitle?: string;
  recipientId?: string | null;
  recipientName?: string | null;
  contextType?: PaymentContextType;
  contextId?: string | null;
  metadata?: Record<string, any>;
  className?: string;
  children?: ReactNode;
  onSuccess?: (result: PaymentResult) => void;
}) {
  const { openPayment } = useUnifiedPayment();

  const handleClick = async () => {
    const result = await openPayment({
      amount,
      currency,
      title,
      subtitle,
      recipientId,
      recipientName,
      contextType,
      contextId,
      metadata,
    });
    if (result.ok) onSuccess?.(result);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={
        className ||
        "rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
      }
    >
      {children || `Pay ${formatMoney(amount, currency)}`}
    </button>
  );
}

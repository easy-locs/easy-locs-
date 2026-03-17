/**
 * UnifiedPaymentSystem — Single payment context for the entire super app.
 * Uses the atomic wallet_transfer RPC for real balance-checked transfers.
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { CheckCircle2, Wallet, X, AlertTriangle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { walletTransfer } from "@/payments/wallet-hooks";

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

function formatMoney(amount: number, currency = "AED") {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
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

  const closePayment = useCallback(() => {
    if (loading) return;
    setOpen(false);
    setRequest(null);
    setSuccess(null);
    setError("");
  }, [loading]);

  const openPayment = useCallback((req: PaymentRequest) => {
    setRequest(req);
    setSuccess(null);
    setError("");
    setOpen(true);
    return new Promise<PaymentResult>((resolve) => {
      setResolver({ resolve });
    });
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!request || loading) return;
    if (!user?.id) {
      setError("You must sign in to pay.");
      return;
    }
    if (!request.recipientId) {
      setError("No recipient specified.");
      return;
    }

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
      const msg = err?.message || "Payment failed";
      setError(msg);
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

      {open && request && (
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm">
          <div className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-md rounded-t-3xl border border-border/50 bg-background p-5 shadow-2xl animate-in slide-in-from-bottom duration-300">
            {!success ? (
              <>
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">
                      Unified Payment
                    </div>
                    <h2 className="mt-1 text-xl font-bold text-foreground">
                      {request.title || "Confirm payment"}
                    </h2>
                    {request.subtitle && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        {request.subtitle}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={closePayment}
                    className="rounded-full p-2 text-muted-foreground transition hover:bg-muted"
                    aria-label="Close payment"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="rounded-2xl border border-border/40 bg-card p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        <Wallet className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-foreground">
                          {request.recipientName || "Payment"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {request.contextType || "generic"}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-foreground">
                        {formatMoney(request.amount, request.currency || "AED")}
                      </div>
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="mt-3 flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    {error}
                  </div>
                )}

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={closePayment}
                    disabled={loading}
                    className="rounded-2xl border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-muted disabled:opacity-60"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirm}
                    disabled={loading}
                    className="rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
                  >
                    {loading
                      ? "Processing..."
                      : `Pay ${formatMoney(request.amount, request.currency || "AED")}`}
                  </button>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <h2 className="text-xl font-bold text-foreground">Payment successful</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  {formatMoney(request.amount, request.currency || "AED")} sent successfully.
                </p>
                {success.transactionId && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Ref: {success.transactionId}
                  </p>
                )}
                <button
                  type="button"
                  onClick={handleCloseAfterSuccess}
                  className="mt-5 w-full rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}
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

/** Reusable compact payment button */
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

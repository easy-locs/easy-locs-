import { useState, useEffect, useRef, useCallback } from "react";
import { createStripeIntent } from "@/repositories/payments.repository";
import { Button } from "@/components/ui/button";
import { Loader2, CreditCard, CheckCircle2, AlertTriangle, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { formatMoney } from "@/lib/format";

interface CardPaymentProps {
  amount: number;
  currency?: string;
  orderId?: string;
  metadata?: Record<string, string>;
  onSuccess: (paymentIntentId: string) => void;
  onError?: (error: string) => void;
}

let stripeLoadPromise: Promise<any> | null = null;

function ensureStripeLoaded(): Promise<any> {
  if (stripeLoadPromise) return stripeLoadPromise;
  stripeLoadPromise = new Promise((resolve, reject) => {
    if ((window as any).Stripe) {
      const pk = import.meta.env.VITE_STRIPE_PUBLIC_KEY || "";
      if (!pk) { reject(new Error("Payment configuration missing")); return; }
      resolve((window as any).Stripe(pk));
      return;
    }
    const script = document.createElement("script");
    script.src = "https://js.stripe.com/v3/";
    script.async = true;
    script.onload = () => {
      const pk = import.meta.env.VITE_STRIPE_PUBLIC_KEY || "";
      if ((window as any).Stripe && pk) {
        resolve((window as any).Stripe(pk));
      } else {
        reject(new Error(pk ? "Payment service failed to initialize" : "Payment configuration missing"));
      }
    };
    script.onerror = () => {
      stripeLoadPromise = null;
      reject(new Error("Failed to load payment service"));
    };
    document.head.appendChild(script);
  });
  return stripeLoadPromise;
}

export default function CardPayment({ amount, currency = "AED", orderId, metadata, onSuccess, onError }: CardPaymentProps) {
  const [stage, setStage] = useState<
    "loading" | "ready" | "confirming" | "success" | "error"
  >("loading");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const stripeRef = useRef<any>(null);
  const cardElementRef = useRef<any>(null);
  const cardMountRef = useRef<HTMLDivElement>(null);
  const clientSecretRef = useRef<string | null>(null);
  const paymentIntentIdRef = useRef<string | null>(null);
  const mountedRef = useRef(true);
  const initAttemptedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (!initAttemptedRef.current) {
      initAttemptedRef.current = true;
      initializePayment();
    }
  }, []);

  const initializePayment = useCallback(async () => {
    setStage("loading");
    setErrorMsg(null);

    try {
      const stripe = await ensureStripeLoaded();
      if (!mountedRef.current) return;
      stripeRef.current = stripe;

      const data = await createStripeIntent({
        amount,
        currency: currency.toLowerCase(),
        orderId,
        metadata,
      });
      if (!mountedRef.current) return;

      if (!data?.clientSecret) throw new Error("Payment service returned no authorization");
      clientSecretRef.current = data.clientSecret;
      paymentIntentIdRef.current = data.paymentIntentId;

      if (cardElementRef.current) {
        cardElementRef.current.destroy();
        cardElementRef.current = null;
      }

      const elements = stripe.elements({
        clientSecret: data.clientSecret,
        appearance: {
          theme: "night",
          variables: {
            colorPrimary: "#c9943e",
            colorBackground: "#1a2744",
            colorText: "#e2e8f0",
            colorDanger: "#ef4444",
            fontFamily: "system-ui, sans-serif",
            borderRadius: "12px",
          },
        },
      });

      const card = elements.create("card", {
        style: {
          base: {
            fontSize: "1rem",
            color: "#e2e8f0",
            "::placeholder": { color: "#64748b" },
          },
          invalid: { color: "#ef4444" },
        },
      });

      if (cardMountRef.current) {
        card.mount(cardMountRef.current);
        cardElementRef.current = card;
        setStage("ready");
      }
    } catch (err: any) {
      if (!mountedRef.current) return;
      const msg = err.message || "Payment initialization failed";
      setErrorMsg(msg);
      setStage("error");
    }
  }, [amount, currency, orderId, metadata]);

  const confirmPayment = async () => {
    if (!stripeRef.current || !cardElementRef.current || !clientSecretRef.current) return;

    setStage("confirming");
    setErrorMsg(null);

    try {
      const { error, paymentIntent } = await stripeRef.current.confirmCardPayment(
        clientSecretRef.current,
        { payment_method: { card: cardElementRef.current } }
      );

      if (!mountedRef.current) return;

      if (error) throw new Error(error.message || "Payment was declined");

      if (paymentIntent?.status === "succeeded") {
        setStage("success");
        toast.success(`Payment of ${formatMoney(amount, currency)} confirmed`);
        onSuccess(paymentIntentIdRef.current || paymentIntent.id);
      } else if (paymentIntent?.status === "requires_action") {
        throw new Error("Additional verification required — please try again");
      } else {
        throw new Error(`Payment not completed (status: ${paymentIntent?.status})`);
      }
    } catch (err: any) {
      if (!mountedRef.current) return;
      const msg = err.message || "Payment failed";
      setErrorMsg(msg);
      setStage("error");
      onError?.(msg);
    }
  };

  const retry = () => {
    initAttemptedRef.current = false;
    stripeLoadPromise = null;
    initializePayment();
  };

  return (
    <div className="space-y-3">
      <div
        ref={cardMountRef}
        className="min-h-[44px] rounded-xl border border-border/30 bg-card/80 px-3 py-3"
        style={{ display: stage === "loading" || stage === "error" ? "none" : undefined }}
      />

      {stage === "loading" && (
        <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Preparing secure payment...
        </div>
      )}

      {errorMsg && (
        <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/5 rounded-lg px-3 py-2">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          <span className="flex-1">{errorMsg}</span>
        </div>
      )}

      {stage === "error" && (
        <Button onClick={retry} variant="outline" className="w-full rounded-xl h-10 text-sm">
          <RefreshCw className="h-3.5 w-3.5 mr-2" />
          Retry
        </Button>
      )}

      {(stage === "ready" || stage === "confirming") && (
        <Button
          onClick={confirmPayment}
          disabled={stage === "confirming"}
          className="w-full rounded-xl h-12"
          variant="default"
        >
          {stage === "confirming" ? (
            <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Confirming payment...</>
          ) : (
            <><CreditCard className="h-4 w-4 mr-2" /> Pay {formatMoney(amount, currency)}</>
          )}
        </Button>
      )}

      {stage === "success" && (
        <div className="flex items-center justify-center gap-2 py-3 text-sm font-semibold text-green-400">
          <CheckCircle2 className="h-4 w-4" />
          Payment confirmed
        </div>
      )}
    </div>
  );
}

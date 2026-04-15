import { useState, useEffect, useRef, useCallback } from "react";
import { createStripeIntent } from "@/repositories/payments.repository";
import { Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface AppleGooglePayButtonProps {
  amount: number;
  currency?: string;
  label?: string;
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

export default function AppleGooglePayButton({
  amount,
  currency = "EUR",
  label = "Easy-Locs",
  orderId,
  metadata,
  onSuccess,
  onError,
}: AppleGooglePayButtonProps) {
  const [stage, setStage] = useState<"loading" | "available" | "unavailable" | "processing" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [paymentType, setPaymentType] = useState<string | null>(null);
  const mountRef = useRef<HTMLDivElement>(null);
  const stripeRef = useRef<any>(null);
  const prButtonRef = useRef<any>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const initPaymentRequest = useCallback(async () => {
    setStage("loading");
    setErrorMsg(null);

    try {
      const stripe = await ensureStripeLoaded();
      if (!mountedRef.current) return;
      stripeRef.current = stripe;

      const paymentRequest = stripe.paymentRequest({
        country: "FR",
        currency: currency.toLowerCase(),
        total: {
          label,
          amount: Math.round(amount * 100),
        },
        requestPayerName: true,
        requestPayerEmail: true,
      });

      const canMakePayment = await paymentRequest.canMakePayment();
      if (!mountedRef.current) return;

      if (!canMakePayment) {
        setStage("unavailable");
        return;
      }

      setPaymentType(
        canMakePayment.applePay ? "apple_pay" :
        canMakePayment.googlePay ? "google_pay" : "payment_request"
      );

      paymentRequest.on("paymentmethod", async (ev: any) => {
        try {
          const data = await createStripeIntent({
            amount,
            currency: currency.toLowerCase(),
            orderId,
            metadata: { payment_type: "payment_request_button", ...metadata },
          });

          if (!data?.clientSecret) {
            ev.complete("fail");
            throw new Error("Failed to create payment");
          }

          const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(
            data.clientSecret,
            { payment_method: ev.paymentMethod.id },
            { handleActions: false }
          );

          if (confirmError) {
            ev.complete("fail");
            throw new Error(confirmError.message || "Payment failed");
          }

          if (paymentIntent.status === "requires_action") {
            ev.complete("success");
            const { error: actionError, paymentIntent: updatedIntent } =
              await stripe.confirmCardPayment(data.clientSecret);

            if (actionError) {
              throw new Error(actionError.message || "Authentication failed");
            }

            if (updatedIntent?.status === "succeeded") {
              toast.success("Payment confirmed");
              onSuccess(data.paymentIntentId || updatedIntent.id);
            } else {
              throw new Error("Payment not completed");
            }
          } else if (paymentIntent.status === "succeeded") {
            ev.complete("success");
            toast.success("Payment confirmed");
            onSuccess(data.paymentIntentId || paymentIntent.id);
          } else {
            ev.complete("fail");
            throw new Error("Payment not completed");
          }
        } catch (err: any) {
          const msg = err.message || "Payment failed";
          setErrorMsg(msg);
          setStage("error");
          onError?.(msg);
        }
      });

      const elements = stripe.elements();
      const prButton = elements.create("paymentRequestButton", {
        paymentRequest,
        style: {
          paymentRequestButton: {
            type: "default",
            theme: "dark",
            height: "48px",
          },
        },
      });

      if (mountRef.current) {
        prButton.mount(mountRef.current);
        prButtonRef.current = prButton;
        setStage("available");
      }
    } catch (err: any) {
      if (!mountedRef.current) return;
      setStage("unavailable");
    }
  }, [amount, currency, label, orderId, metadata, onSuccess, onError]);

  useEffect(() => {
    initPaymentRequest();
    return () => {
      if (prButtonRef.current) {
        prButtonRef.current.destroy();
        prButtonRef.current = null;
      }
    };
  }, [initPaymentRequest]);

  if (stage === "unavailable") return null;

  return (
    <div className="space-y-2">
      {stage === "loading" && (
        <div className="flex items-center justify-center gap-2 py-3 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Checking {paymentType === "apple_pay" ? "Apple Pay" : "Google Pay"} availability...
        </div>
      )}

      <div
        ref={mountRef}
        className="min-h-[48px] rounded-xl overflow-hidden"
        style={{ display: stage === "available" ? undefined : "none" }}
      />

      {errorMsg && (
        <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/5 rounded-lg px-3 py-2">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          <span className="flex-1">{errorMsg}</span>
        </div>
      )}
    </div>
  );
}

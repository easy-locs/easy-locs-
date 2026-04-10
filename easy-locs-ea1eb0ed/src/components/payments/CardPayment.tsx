import { useState, useEffect, useRef } from "react";
import { createStripeIntent } from "@/repositories/payments.repository";
import { Button } from "@/components/ui/button";
import { Loader2, CreditCard, CheckCircle2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { formatMoney } from "@/lib/format";

interface CardPaymentProps {
  amount: number;
  currency?: string;
  orderId?: string;
  onSuccess: () => void;
}

export default function CardPayment({ amount, currency = "AED", orderId, onSuccess }: CardPaymentProps) {
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState<"idle" | "creating_intent" | "confirming" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const stripeRef = useRef<any>(null);
  const elementsRef = useRef<any>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadStripe = async () => {
      if ((window as any).Stripe) {
        stripeRef.current = (window as any).Stripe(
          import.meta.env.VITE_STRIPE_PUBLIC_KEY || ""
        );
      }
    };
    loadStripe();
  }, []);

  const pay = async () => {
    setLoading(true);
    setStage("creating_intent");
    setErrorMsg(null);

    try {
      const data = await createStripeIntent({ amount, currency: currency.toLowerCase(), orderId });
      const { clientSecret } = data;
      if (!clientSecret) throw new Error("No client secret returned from payment service");

      if (!stripeRef.current) {
        throw new Error("Payment service unavailable — please reload the page and try again");
      }

      setStage("confirming");
      const { error: confirmError } = await stripeRef.current.confirmCardPayment(clientSecret, {
        payment_method: elementsRef.current
          ? { card: elementsRef.current }
          : undefined,
      });

      if (confirmError) {
        throw new Error(confirmError.message || "Payment confirmation failed");
      }

      setStage("success");
      toast.success(`Payment of ${formatMoney(amount, currency)} confirmed`);
      setTimeout(onSuccess, 600);
    } catch (err: any) {
      const msg = err.message || "Payment failed";
      setErrorMsg(msg);
      setStage("error");
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div ref={cardRef} className="min-h-[44px] rounded-xl border border-border/30 bg-card/80 px-3 py-3" />

      {errorMsg && (
        <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/5 rounded-lg px-3 py-2">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          {errorMsg}
        </div>
      )}

      <Button
        onClick={pay}
        disabled={loading || stage === "success"}
        className="w-full rounded-xl h-12"
        variant="default"
      >
        {stage === "success" ? (
          <><CheckCircle2 className="h-4 w-4 mr-2" /> Paid</>
        ) : loading ? (
          <><Loader2 className="h-4 w-4 animate-spin mr-2" /> {stage === "creating_intent" ? "Processing…" : "Confirming…"}</>
        ) : (
          <><CreditCard className="h-4 w-4 mr-2" /> Pay {formatMoney(amount, currency)}</>
        )}
      </Button>
    </div>
  );
}

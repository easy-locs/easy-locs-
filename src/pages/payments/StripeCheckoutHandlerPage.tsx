import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { captureLiveCardPayment } from "@/lib/payments/paymentLiveConnector";

export default function StripeCheckoutHandlerPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [done, setDone] = useState(false);

  useEffect(() => {
    let live = true;

    const run = async () => {
      const orderId = params.get("orderId");
      const paymentIntentId = params.get("payment_intent") || params.get("paymentIntentId");

      if (!orderId || !paymentIntentId) {
        toast.error("Missing payment information");
        navigate("/checkout");
        return;
      }

      try {
        await captureLiveCardPayment({ orderId, paymentIntentId });
        if (!live) return;
        setDone(true);
        toast.success("Card payment confirmed");
        navigate(`/tracking/${orderId}`);
      } catch (e: any) {
        toast.error(e.message || "Could not confirm payment");
        navigate("/checkout");
      }
    };

    run();
    return () => {
      live = false;
    };
  }, [navigate, params]);

  return (
    <div className="app-mobile-page bg-background flex items-center justify-center p-4">
      <div className="rounded-2xl border border-border/20 bg-card p-6 text-center max-w-sm w-full">
        <h1 className="text-lg font-bold text-foreground">Payment Confirmation</h1>
        <p className="text-sm text-muted-foreground mt-2">
          {done ? "Payment confirmed." : "Checking payment status..."}
        </p>
      </div>
    </div>
  );
}

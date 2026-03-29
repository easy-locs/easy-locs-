/**
 * StripeCheckoutButton — Canonical payment button using create-stripe-intent.
 * Uses PaymentIntent flow (not legacy Checkout Sessions).
 */
import { useState } from "react";
import { createStripeIntent } from "@/repositories/payments.repository";
import { toast } from "sonner";

export function StripeCheckoutButton(props: {
  label?: string;
  name: string;
  amountMinor: number;
  currency: string;
  metadata?: Record<string, string>;
  onSuccess?: (intentId: string) => void;
}) {
  const [loading, setLoading] = useState(false);

  const handlePay = async () => {
    setLoading(true);
    try {
      const data = await createStripeIntent({
        amount: props.amountMinor / 100,
        currency: props.currency.toLowerCase(),
        metadata: { ...props.metadata, item_name: props.name },
      });
      if (!data?.clientSecret) throw new Error("No payment intent created");

      // Navigate to unified payment confirmation page
      const params = new URLSearchParams({
        client_secret: data.clientSecret,
        intent_id: data.paymentIntentId,
        amount: String(props.amountMinor / 100),
        currency: props.currency,
        label: props.name,
      });
      window.location.href = `/wallet/pay-confirm?${params.toString()}`;
    } catch (err: any) {
      console.error("Payment error:", err);
      toast.error(err?.message || "Payment failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      disabled={loading}
      onClick={handlePay}
      className="rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground active:scale-95 transition-all disabled:opacity-50"
    >
      {loading ? "Processing..." : props.label ?? "Pay with Stripe"}
    </button>
  );
}

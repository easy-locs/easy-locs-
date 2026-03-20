import { useState } from "react";
import { createCheckoutSession } from "@/lib/payments/createCheckoutSession";

export function StripeCheckoutButton(props: {
  label?: string;
  name: string;
  amountMinor: number;
  currency: string;
  metadata?: Record<string, string>;
}) {
  const [loading, setLoading] = useState(false);

  return (
    <button
      disabled={loading}
      className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
      onClick={async () => {
        setLoading(true);
        try {
          const url = await createCheckoutSession({
            successUrl: `${window.location.origin}/v2-payments?status=success`,
            cancelUrl: `${window.location.origin}/v2-payments?status=cancel`,
            lineItems: [
              {
                name: props.name,
                amount: props.amountMinor,
                currency: props.currency.toLowerCase(),
                quantity: 1,
              },
            ],
            metadata: props.metadata,
          });
          window.location.href = url;
        } catch (err) {
          console.error("Stripe checkout error:", err);
        } finally {
          setLoading(false);
        }
      }}
    >
      {loading ? "Processing..." : props.label ?? "Pay with Stripe"}
    </button>
  );
}

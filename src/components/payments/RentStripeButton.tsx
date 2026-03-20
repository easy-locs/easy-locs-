import { useState } from "react";
import { createCheckoutSession } from "@/lib/payments/createCheckoutSession";
import { Button } from "@/components/ui/button";

export function RentStripeButton(props: {
  rentPaymentId: string;
  amount: number;
  currency: string;
  leaseId: string;
}) {
  const [loading, setLoading] = useState(false);

  return (
    <Button
      size="sm"
      disabled={loading}
      className="rounded-xl text-xs font-bold"
      onClick={async () => {
        setLoading(true);
        try {
          const url = await createCheckoutSession({
            successUrl: `${window.location.origin}/payments?rent=${props.rentPaymentId}&status=success`,
            cancelUrl: `${window.location.origin}/payments?rent=${props.rentPaymentId}&status=cancel`,
            lineItems: [
              {
                name: `Rent ${props.rentPaymentId}`,
                amount: Math.round(props.amount * 100),
                currency: props.currency.toLowerCase(),
                quantity: 1,
              },
            ],
            metadata: {
              rentPaymentId: props.rentPaymentId,
              leaseId: props.leaseId,
              flow: "rent_payment",
            },
          });
          window.location.href = url;
        } catch (err) {
          console.error("Rent checkout error:", err);
        } finally {
          setLoading(false);
        }
      }}
    >
      {loading ? "Processing…" : "Pay Rent"}
    </Button>
  );
}

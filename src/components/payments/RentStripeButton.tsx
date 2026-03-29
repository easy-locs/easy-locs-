/**
 * RentStripeButton — Canonical rent payment via create-stripe-intent.
 */
import { useState } from "react";
import { createStripeIntent } from "@/repositories/payments.repository";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

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
          const data = await createStripeIntent({
            amount: props.amount,
            currency: props.currency.toLowerCase(),
            metadata: {
              rentPaymentId: props.rentPaymentId,
              leaseId: props.leaseId,
              flow: "rent_payment",
            },
          });
          const params = new URLSearchParams({
            client_secret: data.clientSecret,
            intent_id: data.paymentIntentId,
            amount: String(props.amount),
            currency: props.currency,
            label: `Rent ${props.rentPaymentId}`,
          });
          window.location.href = `/wallet/pay-confirm?${params.toString()}`;
        } catch (err: any) {
          console.error("Rent payment error:", err);
          toast.error(err?.message || "Payment failed");
        } finally {
          setLoading(false);
        }
      }}
    >
      {loading ? "Processing…" : "Pay Rent"}
    </Button>
  );
}

/**
 * BookingStripeButton — Canonical booking payment via create-stripe-intent.
 */
import { useState } from "react";
import { createStripeIntent } from "@/repositories/payments.repository";
import { useBookingStore } from "@/stores/bookingStore";
import { useCheckoutDiscountStore } from "@/stores/checkoutDiscountStore";
import { computeDiscountedAmount } from "@/lib/payments/amounts";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function BookingStripeButton(props: { bookingId: string }) {
  const booking = useBookingStore((s) => s.getBookingById(props.bookingId));
  const appliedCode = useCheckoutDiscountStore((s) => s.appliedCode);
  const discountAmount = useCheckoutDiscountStore((s) => s.discountAmount);
  const [loading, setLoading] = useState(false);

  if (!booking) return null;

  return (
    <Button
      size="sm"
      disabled={loading}
      className="rounded-xl text-xs font-bold"
      onClick={async () => {
        setLoading(true);
        try {
          const finalAmount = computeDiscountedAmount({
            originalAmount: booking.amount,
            discountAmount,
          });

          const data = await createStripeIntent({
            amount: finalAmount,
            currency: booking.currency.toLowerCase(),
            metadata: {
              bookingId: booking.id,
              listingId: booking.listingId,
              flow: "booking_payment",
              couponCode: appliedCode ?? "",
              originalAmount: String(booking.amount),
              discountAmount: String(discountAmount ?? 0),
              finalAmount: String(finalAmount),
            },
          });
          const params = new URLSearchParams({
            client_secret: data.clientSecret,
            intent_id: data.paymentIntentId,
            amount: String(finalAmount),
            currency: booking.currency,
            label: `Booking ${booking.id}`,
          });
          window.location.href = `/wallet/pay-confirm?${params.toString()}`;
        } catch (err: any) {
          console.error("Booking payment error:", err);
          toast.error(err?.message || "Payment failed");
        } finally {
          setLoading(false);
        }
      }}
    >
      {loading ? "Processing…" : "Pay Booking"}
    </Button>
  );
}

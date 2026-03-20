import { useState } from "react";
import { createCheckoutSession } from "@/lib/payments/createCheckoutSession";
import { useBookingStore } from "@/stores/bookingStore";
import { useCheckoutDiscountStore } from "@/stores/checkoutDiscountStore";
import { computeDiscountedAmount } from "@/lib/payments/amounts";
import { Button } from "@/components/ui/button";

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

          const url = await createCheckoutSession({
            successUrl: `${window.location.origin}/v2-payments?booking=${booking.id}&status=success`,
            cancelUrl: `${window.location.origin}/v2-payments?booking=${booking.id}&status=cancel`,
            lineItems: [
              {
                name: `Booking ${booking.id}${appliedCode ? ` (${appliedCode})` : ""}`,
                amount: Math.round(finalAmount * 100),
                currency: booking.currency.toLowerCase(),
                quantity: 1,
              },
            ],
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
          window.location.href = url;
        } catch (err) {
          console.error("Booking checkout error:", err);
        } finally {
          setLoading(false);
        }
      }}
    >
      {loading ? "Processing…" : "Pay Booking"}
    </Button>
  );
}

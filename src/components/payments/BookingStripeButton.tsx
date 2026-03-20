import { useState } from "react";
import { createCheckoutSession } from "@/lib/payments/createCheckoutSession";
import { useBookingStore } from "@/stores/bookingStore";
import { Button } from "@/components/ui/button";

export function BookingStripeButton(props: { bookingId: string }) {
  const booking = useBookingStore((s) => s.getBookingById(props.bookingId));
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
          const url = await createCheckoutSession({
            successUrl: `${window.location.origin}/payments?booking=${booking.id}&status=success`,
            cancelUrl: `${window.location.origin}/payments?booking=${booking.id}&status=cancel`,
            lineItems: [
              {
                name: `Booking ${booking.id}`,
                amount: Math.round(booking.amount * 100),
                currency: booking.currency.toLowerCase(),
                quantity: 1,
              },
            ],
            metadata: {
              bookingId: booking.id,
              listingId: booking.listingId,
              flow: "booking_payment",
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

import { useEffect, useState } from "react";
import { AppPageShell } from "@/components/layout/AppPageShell";
import { BookingList } from "@/components/booking/BookingList";
import { BookingDetailCard } from "@/components/booking/BookingDetailCard";
import { BookingStripeButton } from "@/components/payments/BookingStripeButton";
import { useBookingQuerySync } from "@/hooks/useBookingQuerySync";

export default function BookingsPage() {
  const [bookingId, setBookingId] = useState<string | null>(null);
  const { searchParams, setBookingInUrl } = useBookingQuerySync();

  useEffect(() => {
    const fromUrl = searchParams.get("booking");
    if (fromUrl) setBookingId(fromUrl);
  }, [searchParams]);

  return (
    <AppPageShell title="Bookings">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <BookingList
          mode="all"
          onOpen={(id) => {
            setBookingId(id);
            setBookingInUrl(id);
          }}
        />

        <div className="space-y-3">
          <BookingDetailCard bookingId={bookingId} />
          {bookingId ? <BookingStripeButton bookingId={bookingId} /> : null}
        </div>
      </div>
    </AppPageShell>
  );
}

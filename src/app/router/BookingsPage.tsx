import { useState } from "react";
import { AppPageShell } from "@/components/layout/AppPageShell";
import { BookingList } from "@/components/booking/BookingList";
import { BookingDetailCard } from "@/components/booking/BookingDetailCard";

export default function BookingsPage() {
  const [bookingId, setBookingId] = useState<string | null>(null);

  return (
    <AppPageShell title="Bookings">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <BookingList mode="all" onOpen={setBookingId} />
        <BookingDetailCard bookingId={bookingId} />
      </div>
    </AppPageShell>
  );
}

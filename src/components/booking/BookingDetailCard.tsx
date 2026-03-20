import { useBookingStore } from "@/stores/bookingStore";

export function BookingDetailCard(props: {
  bookingId: string | null;
}) {
  const getBookingById = useBookingStore((s) => s.getBookingById);
  const booking = props.bookingId ? getBookingById(props.bookingId) : null;

  if (!booking) {
    return (
      <div className="rounded-lg border border-border p-4">
        <h3 className="text-lg font-semibold text-foreground">Booking Details</h3>
        <p className="text-sm text-muted-foreground">No booking selected</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border p-4 flex flex-col gap-1">
      <h3 className="text-lg font-semibold text-foreground">Booking Details</h3>
      <p className="text-sm text-muted-foreground">ID: {booking.id}</p>
      <p className="text-sm text-muted-foreground">Status: {booking.status}</p>
      <p className="text-sm text-muted-foreground">Listing: {booking.listingId}</p>
      <p className="text-sm text-muted-foreground">Buyer: {booking.buyerOrbitId}</p>
      <p className="text-sm text-muted-foreground">Owner: {booking.ownerOrbitId}</p>
      <p className="text-sm text-muted-foreground">Amount: {booking.amount} {booking.currency}</p>
      <p className="text-sm text-muted-foreground">Dates: {booking.checkIn} → {booking.checkOut}</p>
      <p className="text-sm text-muted-foreground">Conversation: {booking.conversationId ?? "none"}</p>
    </div>
  );
}

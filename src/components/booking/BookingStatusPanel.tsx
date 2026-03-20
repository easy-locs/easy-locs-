import { useMemo } from "react";
import { useBookingStore } from "@/stores/bookingStore";
import { useOrbitStore } from "@/stores/orbitStore";
import { useBookingActionsStore } from "@/stores/bookingActionsStore";

export function BookingStatusPanel() {
  const orbit = useOrbitStore((s) => s.profile);
  const bookings = useBookingStore((s) => s.bookings);
  const ownerApproveBooking = useBookingActionsStore((s) => s.ownerApproveBooking);
  const ownerRejectBooking = useBookingActionsStore((s) => s.ownerRejectBooking);
  const ownerCompleteBooking = useBookingActionsStore((s) => s.ownerCompleteBooking);

  const ownerBookings = useMemo(
    () => bookings.filter((b) => b.ownerOrbitId === orbit?.orbitId),
    [bookings, orbit?.orbitId]
  );

  return (
    <div className="space-y-3 p-4">
      <h3 className="text-sm font-semibold text-foreground">Booking Status Panel</h3>

      <div className="space-y-2">
        {ownerBookings.map((booking) => (
          <div key={booking.id} className="rounded-lg border border-border p-3 space-y-2">
            <p className="text-xs font-medium text-foreground">{booking.id}</p>
            <p className="text-xs text-muted-foreground">Status: {booking.status}</p>
            <p className="text-xs text-primary font-medium">
              {booking.amount} {booking.currency}
            </p>

            <div className="flex gap-2">
              {booking.status === "pending_confirmation" ? (
                <>
                  <button
                    className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                    onClick={() => void ownerApproveBooking(booking.id)}
                  >
                    Approve
                  </button>
                  <button
                    className="rounded-lg bg-destructive px-3 py-1.5 text-xs font-medium text-destructive-foreground hover:bg-destructive/90 transition-colors"
                    onClick={() => void ownerRejectBooking(booking.id)}
                  >
                    Reject
                  </button>
                </>
              ) : null}

              {booking.status === "confirmed" ? (
                <button
                  className="rounded-lg bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground hover:bg-secondary/80 transition-colors"
                  onClick={() => void ownerCompleteBooking(booking.id)}
                >
                  Complete
                </button>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

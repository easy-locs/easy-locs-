import { useMemo } from "react";
import { useBookingStore } from "@/stores/bookingStore";
import { useOrbitIdentity } from "@/hooks/useOrbitIdentity";
import { useSecureBookingActionsStore } from "@/stores/secureBookingActionsStore";

export function BookingStatusPanel() {
  const orbit = useOrbitIdentity();
  const bookings = useBookingStore((s) => s.bookings);
  const loading = useSecureBookingActionsStore((s) => s.loading);
  const approve = useSecureBookingActionsStore((s) => s.approveBookingServer);
  const reject = useSecureBookingActionsStore((s) => s.rejectBookingServer);
  const complete = useSecureBookingActionsStore((s) => s.completeBookingServer);

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
                    disabled={loading}
                    className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
                    onClick={() => void approve(booking.id)}
                  >
                    Approve
                  </button>
                  <button
                    disabled={loading}
                    className="rounded-lg bg-destructive px-3 py-1.5 text-xs font-medium text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50 transition-colors"
                    onClick={() => void reject(booking.id)}
                  >
                    Reject
                  </button>
                </>
              ) : null}

              {booking.status === "confirmed" ? (
                <button
                  disabled={loading}
                  className="rounded-lg bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground hover:bg-secondary/80 disabled:opacity-50 transition-colors"
                  onClick={() => void complete(booking.id)}
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

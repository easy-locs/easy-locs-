import { useMemo } from "react";
import { useBookingStore } from "@/stores/bookingStore";
import { useOrbitStore } from "@/stores/orbitStore";

export function BookingList(props: {
  mode: "owner" | "buyer" | "all";
  onOpen?: (bookingId: string) => void;
}) {
  const bookings = useBookingStore((s) => s.bookings);
  const orbitId = useOrbitStore((s) => s.profile?.orbitId);

  const filtered = useMemo(() => {
    if (props.mode === "all") return bookings;
    if (props.mode === "owner") return bookings.filter((b) => b.ownerOrbitId === orbitId);
    return bookings.filter((b) => b.buyerOrbitId === orbitId);
  }, [bookings, props.mode, orbitId]);

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-lg font-semibold text-foreground">Bookings</h3>
      <div className="flex flex-col gap-2">
        {filtered.map((booking) => (
          <button
            key={booking.id}
            className="rounded-lg border border-border p-3 text-left hover:bg-accent/50 transition-colors"
            onClick={() => props.onOpen?.(booking.id)}
          >
            <p className="font-medium text-foreground">{booking.id}</p>
            <p className="text-sm text-muted-foreground">
              {booking.status} · {booking.amount} {booking.currency}
            </p>
            <p className="text-xs text-muted-foreground">
              {booking.checkIn} → {booking.checkOut}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}

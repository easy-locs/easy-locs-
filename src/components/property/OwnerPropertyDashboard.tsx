import { useMemo } from "react";
import { useOrbitIdentity } from "@/hooks/useOrbitIdentity";
import { useListingStore } from "@/stores/listingStore";
import { useBookingStore } from "@/stores/bookingStore";
import { usePropertyManagementStore } from "@/stores/propertyManagementStore";

export function OwnerPropertyDashboard() {
  const orbit = useOrbitIdentity();
  const listings = useListingStore((s) => s.listings);
  const bookings = useBookingStore((s) => s.bookings);
  const units = usePropertyManagementStore((s) => s.units);
  const leases = usePropertyManagementStore((s) => s.leases);
  const rentPayments = usePropertyManagementStore((s) => s.rentPayments);

  const ownerListings = useMemo(
    () => listings.filter((l) => l.ownerOrbitId === orbit?.orbitId),
    [listings, orbit?.orbitId]
  );

  const ownerBookings = useMemo(
    () => bookings.filter((b) => b.ownerOrbitId === orbit?.orbitId),
    [bookings, orbit?.orbitId]
  );

  const ownerUnits = useMemo(
    () => units.filter((u) => u.ownerOrbitId === orbit?.orbitId),
    [units, orbit?.orbitId]
  );

  const ownerLeases = useMemo(
    () => leases.filter((l) => l.ownerOrbitId === orbit?.orbitId),
    [leases, orbit?.orbitId]
  );

  const ownerRentPayments = useMemo(
    () => rentPayments.filter((p) => p.ownerOrbitId === orbit?.orbitId),
    [rentPayments, orbit?.orbitId]
  );

  return (
    <div className="space-y-4 p-4">
      <div className="rounded-lg border border-border p-3">
        <p className="text-xs text-muted-foreground">Owner Listings</p>
        <p className="text-lg font-semibold text-foreground">{ownerListings.length}</p>
      </div>

      <div className="rounded-lg border border-border p-3">
        <p className="text-xs text-muted-foreground">Owner Bookings</p>
        <p className="text-lg font-semibold text-foreground">{ownerBookings.length}</p>
      </div>

      <div className="rounded-lg border border-border p-3">
        <p className="text-xs text-muted-foreground">Managed Units</p>
        <p className="text-lg font-semibold text-foreground">{ownerUnits.length}</p>
      </div>

      <div className="rounded-lg border border-border p-3">
        <p className="text-xs text-muted-foreground">Leases</p>
        <p className="text-lg font-semibold text-foreground">{ownerLeases.length}</p>
      </div>

      <div className="rounded-lg border border-border p-3">
        <p className="text-xs text-muted-foreground">Rent Payments</p>
        <div className="space-y-1 mt-2">
          {ownerRentPayments.map((payment) => (
            <div key={payment.id} className="rounded border border-border p-2 text-xs">
              <p className="font-medium text-foreground">
                {payment.amount} {payment.currency}
              </p>
              <p className="text-muted-foreground">Due: {payment.dueDate}</p>
              <p className="text-muted-foreground">Status: {payment.status}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

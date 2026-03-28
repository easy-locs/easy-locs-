import { useMemo } from "react";
import { usePropertyManagementStore } from "@/stores/propertyManagementStore";
import { useOrbitIdentity } from "@/hooks/useOrbitIdentity";
import { useSecureRentActionsStore } from "@/stores/secureRentActionsStore";

export function RentStatusPanel() {
  const orbit = useOrbitIdentity();
  const leases = usePropertyManagementStore((s) => s.leases);
  const rentPayments = usePropertyManagementStore((s) => s.rentPayments);
  const loading = useSecureRentActionsStore((s) => s.loading);
  const createRentPaymentServer = useSecureRentActionsStore((s) => s.createRentPaymentServer);

  const ownerLeases = useMemo(
    () => leases.filter((l) => l.ownerOrbitId === orbit?.orbitId),
    [leases, orbit?.orbitId]
  );

  const ownerPayments = useMemo(
    () => rentPayments.filter((p) => p.ownerOrbitId === orbit?.orbitId),
    [rentPayments, orbit?.orbitId]
  );

  return (
    <div className="space-y-3 p-4">
      <h3 className="text-sm font-semibold text-foreground">Rent Status Panel</h3>

      <div className="space-y-2">
        {ownerLeases.map((lease) => (
          <div key={lease.id} className="rounded-lg border border-border p-3 space-y-2">
            <p className="text-xs font-medium text-foreground">Lease {lease.id}</p>
            <p className="text-xs text-muted-foreground">
              Rent: {lease.rentAmount} {lease.currency}
            </p>
            <button
              disabled={loading}
              className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
              onClick={() =>
                void createRentPaymentServer({
                  leaseId: lease.id,
                  dueDate: "2026-04-05",
                  reference: "Server generated rent payment",
                })
              }
            >
              Create Rent Payment
            </button>
          </div>
        ))}

        {ownerPayments.map((payment) => (
          <div key={payment.id} className="rounded-lg border border-border p-3 space-y-1">
            <p className="text-xs font-medium text-foreground">
              {payment.amount} {payment.currency}
            </p>
            <p className="text-xs text-muted-foreground">Due: {payment.dueDate}</p>
            <p className="text-xs text-muted-foreground">Status: {payment.status}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

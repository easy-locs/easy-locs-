import { useMemo } from "react";
import { usePropertyManagementStore } from "@/stores/propertyManagementStore";
import { useOrbitStore } from "@/stores/orbitStore";
import { usePropertyManagementActionsStore } from "@/stores/propertyManagementActionsStore";

export function RentStatusPanel() {
  const orbit = useOrbitStore((s) => s.profile);
  const rentPayments = usePropertyManagementStore((s) => s.rentPayments);
  const markPaymentLate = usePropertyManagementActionsStore((s) => s.markPaymentLate);

  const ownerPayments = useMemo(
    () => rentPayments.filter((p) => p.ownerOrbitId === orbit?.orbitId),
    [rentPayments, orbit?.orbitId]
  );

  return (
    <div className="space-y-3 p-4">
      <h3 className="text-sm font-semibold text-foreground">Rent Status Panel</h3>

      <div className="space-y-2">
        {ownerPayments.map((payment) => (
          <div key={payment.id} className="rounded-lg border border-border p-3 space-y-1">
            <p className="text-xs font-medium text-foreground">
              {payment.amount} {payment.currency}
            </p>
            <p className="text-xs text-muted-foreground">Due: {payment.dueDate}</p>
            <p className="text-xs text-muted-foreground">Status: {payment.status}</p>

            {payment.status === "pending" ? (
              <button
                className="rounded-lg bg-destructive px-3 py-1.5 text-xs font-medium text-destructive-foreground hover:bg-destructive/90 transition-colors mt-1"
                onClick={() => markPaymentLate(payment.id)}
              >
                Mark Late
              </button>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

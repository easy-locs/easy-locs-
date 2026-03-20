import { useMemo } from "react";
import { usePropertyManagementStore } from "@/stores/propertyManagementStore";

export function TenantDashboard(props: {
  tenantOrbitId: string;
}) {
  const leases = usePropertyManagementStore((s) => s.leases);
  const rentPayments = usePropertyManagementStore((s) => s.rentPayments);

  const tenantLeases = useMemo(
    () => leases.filter((l) => l.tenantOrbitId === props.tenantOrbitId),
    [leases, props.tenantOrbitId]
  );

  const tenantPayments = useMemo(
    () => rentPayments.filter((p) => p.tenantOrbitId === props.tenantOrbitId),
    [rentPayments, props.tenantOrbitId]
  );

  return (
    <div className="space-y-4 p-4">
      <div className="rounded-lg border border-border p-3">
        <p className="text-xs text-muted-foreground">Tenant Leases</p>
        <p className="text-lg font-semibold text-foreground">{tenantLeases.length}</p>
      </div>

      <div className="rounded-lg border border-border p-3">
        <p className="text-xs text-muted-foreground">Tenant Rent Payments</p>
        <div className="space-y-1 mt-2">
          {tenantPayments.map((payment) => (
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

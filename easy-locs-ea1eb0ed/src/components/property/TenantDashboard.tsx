import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  realEstateLeaseService,
  realEstatePaymentService,
} from "@/services/real-estate.service";
import type { Lease, PropertyPayment } from "@/domains/real-estate/canonical-types";

export function TenantDashboard(props: {
  tenantOrbitId: string;
}) {
  const { user } = useAuth();
  const [leases, setLeases] = useState<Lease[]>([]);
  const [payments, setPayments] = useState<PropertyPayment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    async function load() {
      try {
        const tenantLeases = await realEstateLeaseService.fetchByTenant(props.tenantOrbitId);
        if (cancelled) return;
        setLeases(tenantLeases);
        const allPayments: PropertyPayment[] = [];
        for (const lease of tenantLeases) {
          const lp = await realEstatePaymentService.fetchByLease(lease.id);
          if (!cancelled) allPayments.push(...lp);
        }
        if (!cancelled) setPayments(allPayments);
      } catch (err) {
        console.error("[TenantDashboard] load error:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [user?.id, props.tenantOrbitId]);

  if (loading) {
    return (
      <div className="space-y-4 p-4">
        <div className="rounded-lg border border-border p-3 animate-pulse">
          <div className="h-4 w-24 bg-muted rounded" />
          <div className="h-6 w-12 bg-muted rounded mt-2" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      <div className="rounded-lg border border-border p-3">
        <p className="text-xs text-muted-foreground">Tenant Leases</p>
        <p className="text-lg font-semibold text-foreground">{leases.length}</p>
      </div>

      <div className="rounded-lg border border-border p-3">
        <p className="text-xs text-muted-foreground">Tenant Rent Payments</p>
        <div className="space-y-1 mt-2">
          {payments.map((payment) => (
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

import { useEffect } from "react";
import { useAnalyticsStore } from "@/stores/analyticsStore";

export function SellerKpiPanel() {
  const hydrateKpiSnapshots = useAnalyticsStore((s) => s.hydrateKpiSnapshots);
  const kpiSnapshots = useAnalyticsStore((s) => s.kpiSnapshots);

  useEffect(() => {
    void hydrateKpiSnapshots();
  }, [hydrateKpiSnapshots]);

  const latest = kpiSnapshots[0];

  if (!latest) {
    return (
      <div className="rounded-lg border border-border p-4">
        <h3 className="text-sm font-semibold text-foreground">Seller KPI</h3>
        <p className="text-xs text-muted-foreground mt-2">No KPI snapshot yet</p>
      </div>
    );
  }

  const kpis = [
    { label: "Listings", value: latest.total_listings },
    { label: "Published", value: latest.published_listings },
    { label: "Bookings", value: latest.total_bookings },
    { label: "Confirmed", value: latest.confirmed_bookings },
    { label: "Completed", value: latest.completed_bookings },
    { label: "Revenue", value: latest.gross_revenue },
    { label: "Pending Rent", value: latest.pending_rent_amount },
    { label: "Paid Rent", value: latest.paid_rent_amount },
  ];

  return (
    <div className="rounded-lg border border-border p-4 space-y-3">
      <h3 className="text-sm font-semibold text-foreground">Seller KPI</h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="rounded-lg border border-border p-3 text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{kpi.label}</p>
            <p className="text-lg font-semibold text-foreground">{kpi.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

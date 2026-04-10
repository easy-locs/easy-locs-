import { BackCard } from "@/components/ui/back-card";
import { useKpiChartData } from "@/hooks/useKpiChartData";
import { useActiveWorkspace } from "@/hooks/useActiveWorkspace";

export default function KpiChartsPage() {
  const { activeWorkspace } = useActiveWorkspace();
  const { labels, ordersSeries, revenueSeries, driversSeries, merchantsSeries } = useKpiChartData(activeWorkspace?.id);

  return (
    <div className="app-mobile-page bg-background p-4 space-y-6 max-w-2xl mx-auto">
      <BackCard />
      <div>
        <h1 className="text-xl font-bold text-foreground">KPI Charts</h1>
        <p className="text-sm text-muted-foreground">Chart-ready data for revenue, orders, drivers, merchants</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {[
          { label: "Orders", data: ordersSeries },
          { label: "Revenue (AED)", data: revenueSeries },
          { label: "Active Drivers", data: driversSeries },
          { label: "Active Merchants", data: merchantsSeries },
        ].map(({ label, data }) => (
          <div key={label} className="rounded-xl border border-border bg-card p-4 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</p>
            <div className="flex items-end gap-1 h-16">
              {data.map((v, i) => (
                <div
                  key={i}
                  className="flex-1 bg-primary/20 rounded-t"
                  style={{ height: `${Math.max(4, (v / (Math.max(...data, 1))) * 100)}%` }}
                  title={`${labels[i]}: ${v}`}
                />
              ))}
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>{labels[0]}</span>
              <span>{labels[labels.length - 1]}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

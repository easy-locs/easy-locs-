import { useNavigate } from "react-router-dom";

const KPIS = [
  { title: "GMV", value: "1.24M AED" },
  { title: "Orders", value: "18,420" },
  { title: "Active Merchants", value: "132" },
  { title: "Active Drivers", value: "58" },
  { title: "Refund Rate", value: "2.1%" },
  { title: "NPS", value: "71" },
];

export default function AdminExecutiveOverviewPage() {
  const navigate = useNavigate();

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/admin")} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">←</button>
        <div>
          <h1 className="text-lg font-bold">Executive Overview</h1>
          <p className="text-xs text-muted-foreground">Top-level business snapshot</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {KPIS.map((kpi) => (
          <div key={kpi.title} className="rounded-2xl border border-border/20 bg-card p-4">
            <div className="text-xs text-muted-foreground">{kpi.title}</div>
            <div className="text-lg font-bold mt-1">{kpi.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

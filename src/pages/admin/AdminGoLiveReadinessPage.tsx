import { useNavigate } from "react-router-dom";

const READINESS_ROWS = [
  { label: "Marketplace data", status: "Ready" },
  { label: "Payments", status: "Watch" },
  { label: "Dispatch", status: "Ready" },
  { label: "Support", status: "Ready" },
  { label: "Driver supply", status: "Watch" },
  { label: "Notifications", status: "Ready" },
  { label: "Realtime", status: "Ready" },
  { label: "Admin monitoring", status: "Ready" },
];

export default function AdminGoLiveReadinessPage() {
  const navigate = useNavigate();

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/admin")} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">←</button>
        <div>
          <h1 className="text-lg font-bold">Go Live Readiness</h1>
          <p className="text-xs text-muted-foreground">Platform launch checklist</p>
        </div>
      </div>

      <div className="space-y-3">
        {READINESS_ROWS.map((row) => (
          <div key={row.label} className="rounded-[28px] border border-border/20 bg-card p-4 flex items-center justify-between gap-3">
            <div className="text-sm font-bold">{row.label}</div>
            <div className={`rounded-full px-3 py-1 text-[11px] font-bold ${
              row.status === "Ready" ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"
            }`}>{row.status}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

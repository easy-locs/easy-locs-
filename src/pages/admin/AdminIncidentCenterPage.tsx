import { useNavigate } from "react-router-dom";

const INCIDENTS = [
  { id: "1", title: "Payment delay", severity: "Medium" },
  { id: "2", title: "Dispatch slowdown", severity: "High" },
  { id: "3", title: "Notification backlog", severity: "Low" },
];

export default function AdminIncidentCenterPage() {
  const navigate = useNavigate();

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/admin")} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">←</button>
        <div>
          <h1 className="text-lg font-bold text-foreground">Incident Center</h1>
          <p className="text-xs text-muted-foreground">Live ops incidents</p>
        </div>
      </div>

      <div className="space-y-3">
        {INCIDENTS.map((row) => (
          <div key={row.id} className="rounded-2xl border border-border/20 bg-card p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-bold text-foreground">{row.title}</div>
                <div className="text-xs text-muted-foreground mt-1">Incident #{row.id}</div>
              </div>
              <div className={`rounded-full px-3 py-1 text-[11px] font-bold ${row.severity === "High" ? "bg-destructive/10 text-destructive" : row.severity === "Medium" ? "bg-amber-500/10 text-amber-500" : "bg-emerald-500/10 text-emerald-500"}`}>
                {row.severity}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

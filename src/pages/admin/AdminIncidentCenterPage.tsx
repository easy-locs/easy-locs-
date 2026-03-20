import { useNavigate } from "react-router-dom";

const INCIDENTS = [
  { id: "inc1", title: "Driver delay spike", severity: "medium" },
  { id: "inc2", title: "Support queue increase", severity: "high" },
  { id: "inc3", title: "Wallet sync timeout", severity: "low" },
];

export default function AdminIncidentCenterPage() {
  const navigate = useNavigate();

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/admin")} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">←</button>
        <div>
          <h1 className="text-lg font-bold">Incident Center</h1>
          <p className="text-xs text-muted-foreground">Platform incidents and alerts</p>
        </div>
      </div>

      <div className="space-y-3">
        {INCIDENTS.map((row) => (
          <div key={row.id} className="rounded-[28px] border border-border/20 bg-card p-4">
            <div className="text-sm font-bold">{row.title}</div>
            <div className="text-xs text-muted-foreground mt-1">Severity: {row.severity}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

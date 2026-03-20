import { useNavigate } from "react-router-dom";

const INCIDENT_FEED = [
  { id: "i1", title: "Payment timeout spike", severity: "high", time: "2 min ago" },
  { id: "i2", title: "Driver shortage in Downtown", severity: "medium", time: "7 min ago" },
  { id: "i3", title: "Merchant menu sync delayed", severity: "low", time: "12 min ago" },
  { id: "i4", title: "Support queue elevated", severity: "medium", time: "18 min ago" },
];

export default function AdminLiveIncidentFeedPage() {
  const navigate = useNavigate();

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/admin")} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">←</button>
        <div>
          <h1 className="text-lg font-bold">Live Incident Feed</h1>
          <p className="text-xs text-muted-foreground">Operational alerts in real time</p>
        </div>
      </div>

      <div className="space-y-3">
        {INCIDENT_FEED.map((row) => (
          <div key={row.id} className="rounded-[28px] border border-border/20 bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-bold">{row.title}</div>
                <div className="text-xs text-muted-foreground mt-1">{row.time}</div>
              </div>
              <div className={`rounded-full px-3 py-1 text-[11px] font-bold ${
                row.severity === "high" ? "bg-destructive/10 text-destructive" :
                row.severity === "medium" ? "bg-amber-500/10 text-amber-500" :
                "bg-emerald-500/10 text-emerald-500"
              }`}>{row.severity}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

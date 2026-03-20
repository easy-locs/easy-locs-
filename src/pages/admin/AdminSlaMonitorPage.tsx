import { useNavigate } from "react-router-dom";

const SLA_ROWS = [
  { service: "Order confirmation", target: "< 30 sec", actual: "12 sec", ok: true },
  { service: "Driver assignment", target: "< 2 min", actual: "1.4 min", ok: true },
  { service: "Refund first response", target: "< 10 min", actual: "14 min", ok: false },
  { service: "Ticket resolution", target: "< 4 h", actual: "2.8 h", ok: true },
];

export default function AdminSlaMonitorPage() {
  const navigate = useNavigate();

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/admin")} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">←</button>
        <div>
          <h1 className="text-lg font-bold text-foreground">SLA Monitor</h1>
          <p className="text-xs text-muted-foreground">Service level tracking</p>
        </div>
      </div>

      <div className="space-y-3">
        {SLA_ROWS.map((row) => (
          <div key={row.service} className="rounded-2xl border border-border/20 bg-card p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-foreground">{row.service}</div>
                <div className="text-xs text-muted-foreground mt-1">Target {row.target} · Actual {row.actual}</div>
              </div>
              <div className={`rounded-full px-3 py-1 text-[11px] font-bold ${row.ok ? "bg-emerald-500/10 text-emerald-500" : "bg-destructive/10 text-destructive"}`}>
                {row.ok ? "OK" : "Breach"}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

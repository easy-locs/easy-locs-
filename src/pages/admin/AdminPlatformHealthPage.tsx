import { useNavigate } from "react-router-dom";

const HEALTH = [
  { service: "Orders", value: "99.98%", status: "healthy" },
  { service: "Dispatch", value: "99.91%", status: "healthy" },
  { service: "Wallet", value: "99.76%", status: "watch" },
  { service: "Notifications", value: "98.84%", status: "watch" },
  { service: "Support", value: "99.42%", status: "healthy" },
];

export default function AdminPlatformHealthPage() {
  const navigate = useNavigate();

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/admin")} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">←</button>
        <div>
          <h1 className="text-lg font-bold">Platform Health</h1>
          <p className="text-xs text-muted-foreground">Live health and uptime view</p>
        </div>
      </div>

      <div className="space-y-3">
        {HEALTH.map((row) => (
          <div key={row.service} className="rounded-2xl border border-border/20 bg-card p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-bold">{row.service}</div>
                <div className="text-xs text-muted-foreground mt-1">Uptime {row.value}</div>
              </div>
              <div className={`rounded-full px-3 py-1 text-[11px] font-bold ${row.status === "healthy" ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"}`}>
                {row.status}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

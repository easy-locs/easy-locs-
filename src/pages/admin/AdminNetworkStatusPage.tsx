import { useNavigate } from "react-router-dom";

const SERVICES = [
  { name: "API Gateway", status: "online" },
  { name: "Payments", status: "online" },
  { name: "Notifications", status: "degraded" },
  { name: "Driver Dispatch", status: "online" },
  { name: "Wallet Ledger", status: "online" },
];

export default function AdminNetworkStatusPage() {
  const navigate = useNavigate();

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/admin")} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">←</button>
        <div>
          <h1 className="text-lg font-bold text-foreground">Network Status</h1>
          <p className="text-xs text-muted-foreground">Core service availability</p>
        </div>
      </div>

      <div className="space-y-3">
        {SERVICES.map((svc) => (
          <div key={svc.name} className="rounded-2xl border border-border/20 bg-card p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-bold text-foreground">{svc.name}</div>
              <div className={`rounded-full px-3 py-1 text-[11px] font-bold ${svc.status === "online" ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"}`}>
                {svc.status}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

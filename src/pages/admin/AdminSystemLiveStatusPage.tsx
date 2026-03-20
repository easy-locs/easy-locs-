import { useNavigate } from "react-router-dom";

const LIVE_ROWS = [
  { system: "Customer app", state: "Live" },
  { system: "Merchant app", state: "Live" },
  { system: "Driver app", state: "Live" },
  { system: "Payments", state: "Watch" },
  { system: "Dispatch engine", state: "Live" },
  { system: "Wallet ledger", state: "Live" },
  { system: "Realtime sync", state: "Live" },
  { system: "Support flow", state: "Live" },
];

export default function AdminSystemLiveStatusPage() {
  const navigate = useNavigate();

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/admin")} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">←</button>
        <div>
          <h1 className="text-lg font-bold">System Live Status</h1>
          <p className="text-xs text-muted-foreground">Platform-wide health view</p>
        </div>
      </div>

      <div className="space-y-3">
        {LIVE_ROWS.map((row) => (
          <div key={row.system} className="rounded-[28px] border border-border/20 bg-card p-4 flex items-center justify-between gap-3">
            <div className="text-sm font-bold">{row.system}</div>
            <div className={`rounded-full px-3 py-1 text-[11px] font-bold ${row.state === "Live" ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"}`}>
              {row.state}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

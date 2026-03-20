import { useNavigate } from "react-router-dom";

const RISK_ROWS = [
  { label: "Payments risk", score: 22 },
  { label: "Refund abuse risk", score: 38 },
  { label: "Driver supply risk", score: 41 },
  { label: "Merchant failure risk", score: 17 },
  { label: "Ops overload risk", score: 29 },
];

export default function AdminRiskScoreboardPage() {
  const navigate = useNavigate();

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/admin")} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">←</button>
        <div>
          <h1 className="text-lg font-bold">Risk Scoreboard</h1>
          <p className="text-xs text-muted-foreground">Fast view of operating risk levels</p>
        </div>
      </div>

      <div className="space-y-3">
        {RISK_ROWS.map((row) => (
          <div key={row.label} className="rounded-[28px] border border-border/20 bg-card p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-semibold">{row.label}</div>
              <div className={`rounded-full px-3 py-1 text-[11px] font-bold ${
                row.score >= 40 ? "bg-destructive/10 text-destructive" :
                row.score >= 25 ? "bg-amber-500/10 text-amber-500" :
                "bg-emerald-500/10 text-emerald-500"
              }`}>{row.score}</div>
            </div>
            <div className="w-full h-3 rounded-full bg-muted mt-3 overflow-hidden">
              <div className="h-full rounded-full bg-primary" style={{ width: `${row.score}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

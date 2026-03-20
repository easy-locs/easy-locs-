import { useNavigate } from "react-router-dom";

const FRAUD_ROWS = [
  { label: "High refund users", value: 3 },
  { label: "Duplicate payment attempts", value: 1 },
  { label: "Suspicious rapid orders", value: 2 },
  { label: "Address mismatch alerts", value: 4 },
];

export default function AdminFraudWatchPage() {
  const navigate = useNavigate();

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/admin")} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">←</button>
        <div>
          <h1 className="text-lg font-bold">Fraud Watch</h1>
          <p className="text-xs text-muted-foreground">Risk and anomaly alerts</p>
        </div>
      </div>

      <div className="space-y-3">
        {FRAUD_ROWS.map((row) => (
          <div key={row.label} className="rounded-[28px] border border-border/20 bg-card p-4 flex items-center justify-between">
            <div className="text-sm font-semibold">{row.label}</div>
            <div className="rounded-full bg-amber-500/10 text-amber-500 px-3 py-1 text-[11px] font-bold">
              {row.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

import { useNavigate } from "react-router-dom";

const FRAUD_ROWS = [
  { id: "1", title: "Repeated refund requests", level: "high" },
  { id: "2", title: "Same card many accounts", level: "medium" },
  { id: "3", title: "Suspicious coupon abuse", level: "medium" },
  { id: "4", title: "Driver location mismatch", level: "low" },
];

export default function AdminFraudWatchPage() {
  const navigate = useNavigate();
  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <Header title="Fraud Watch" subtitle="Risk signal monitor" onBack={() => navigate("/admin")} />
      <div className="space-y-3">
        {FRAUD_ROWS.map((row) => (
          <div key={row.id} className="rounded-2xl border border-border/20 bg-card p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-bold">{row.title}</div>
                <div className="text-xs text-muted-foreground mt-1">Signal #{row.id}</div>
              </div>
              <RiskBadge level={row.level} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Header({ title, subtitle, onBack }: { title: string; subtitle: string; onBack: () => void }) {
  return (
    <div className="flex items-center gap-3">
      <button onClick={onBack} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">←</button>
      <div><h1 className="text-lg font-bold">{title}</h1><p className="text-xs text-muted-foreground">{subtitle}</p></div>
    </div>
  );
}

function RiskBadge({ level }: { level: string }) {
  const cls = level === "high" ? "bg-destructive/10 text-destructive" : level === "medium" ? "bg-amber-500/10 text-amber-500" : "bg-emerald-500/10 text-emerald-500";
  return <div className={`rounded-full px-3 py-1 text-[11px] font-bold ${cls}`}>{level}</div>;
}

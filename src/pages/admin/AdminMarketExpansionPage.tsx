import { useNavigate } from "react-router-dom";

const EXPANSION_ROWS = [
  { city: "Abu Dhabi", merchants: 24, readiness: "High" },
  { city: "Sharjah", merchants: 19, readiness: "Medium" },
  { city: "Ajman", merchants: 11, readiness: "Medium" },
  { city: "Riyadh", merchants: 42, readiness: "High" },
  { city: "Doha", merchants: 15, readiness: "Low" },
];

export default function AdminMarketExpansionPage() {
  const navigate = useNavigate();

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <Header title="Market Expansion" subtitle="City rollout planning" onBack={() => navigate("/admin")} />

      <div className="space-y-3">
        {EXPANSION_ROWS.map((row) => (
          <div key={row.city} className="rounded-[28px] border border-border/20 bg-card p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-bold text-foreground">{row.city}</div>
                <div className="text-xs text-muted-foreground mt-1">Candidate merchants: {row.merchants}</div>
              </div>
              <StatusPill value={row.readiness} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusPill({ value }: { value: string }) {
  const cls = value === "High" ? "bg-emerald-500/10 text-emerald-500" : value === "Medium" ? "bg-amber-500/10 text-amber-500" : "bg-muted text-foreground";
  return <div className={`rounded-full px-3 py-1 text-[11px] font-bold ${cls}`}>{value}</div>;
}

function Header({ title, subtitle, onBack }: { title: string; subtitle: string; onBack: () => void }) {
  return (
    <div className="flex items-center gap-3">
      <button onClick={onBack} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">←</button>
      <div>
        <h1 className="text-lg font-bold">{title}</h1>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}

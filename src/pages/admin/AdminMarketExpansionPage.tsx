import { useNavigate } from "react-router-dom";

const EXPANSION_ROWS = [
  { city: "Ajman", demand: "Medium", priority: "Phase 2" },
  { city: "Al Ain", demand: "High", priority: "Phase 1" },
  { city: "Ras Al Khaimah", demand: "Low", priority: "Phase 3" },
];

export default function AdminMarketExpansionPage() {
  const navigate = useNavigate();
  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <Header title="Market Expansion" subtitle="City rollout planning" onBack={() => navigate("/admin")} />
      <div className="space-y-3">
        {EXPANSION_ROWS.map((row) => (
          <div key={row.city} className="rounded-2xl border border-border/20 bg-card p-4">
            <div className="text-sm font-bold">{row.city}</div>
            <div className="text-xs text-muted-foreground mt-1">Demand {row.demand} · {row.priority}</div>
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

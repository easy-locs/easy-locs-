import { useNavigate } from "react-router-dom";

const HOT_ZONES = [
  { name: "Dubai Marina", multiplier: "1.3x", demand: "High" },
  { name: "Business Bay", multiplier: "1.2x", demand: "High" },
  { name: "JLT", multiplier: "1.1x", demand: "Medium" },
  { name: "Downtown", multiplier: "1.25x", demand: "High" },
];

export default function DriverHotZonesPage() {
  const navigate = useNavigate();
  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <Header title="Hot Zones" subtitle="High demand areas" onBack={() => navigate("/driver/dashboard")} />
      <div className="space-y-3">
        {HOT_ZONES.map((row) => (
          <div key={row.name} className="rounded-2xl border border-border/20 bg-card p-4">
            <div className="text-sm font-bold">{row.name}</div>
            <div className="text-xs text-muted-foreground mt-1">Demand {row.demand} · Boost {row.multiplier}</div>
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

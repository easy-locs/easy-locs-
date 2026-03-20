import { useNavigate } from "react-router-dom";

const ZONES = [
  { name: "Dubai Marina", demand: "High", bonus: "12 AED" },
  { name: "JLT", demand: "Medium", bonus: "8 AED" },
  { name: "Business Bay", demand: "High", bonus: "15 AED" },
  { name: "Downtown Dubai", demand: "High", bonus: "18 AED" },
];

export default function DriverHotZonesPage() {
  const navigate = useNavigate();

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <Header title="Hot Zones" subtitle="High-demand delivery areas" onBack={() => navigate("/driver/dashboard")} />

      <div className="space-y-3">
        {ZONES.map((zone) => (
          <div key={zone.name} className="rounded-[28px] border border-border/20 bg-card p-4">
            <div className="text-sm font-bold">{zone.name}</div>
            <div className="text-xs text-muted-foreground mt-1">Demand: {zone.demand}</div>
            <div className="text-sm font-semibold mt-2">Bonus: {zone.bonus}</div>
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
      <div>
        <h1 className="text-lg font-bold">{title}</h1>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}

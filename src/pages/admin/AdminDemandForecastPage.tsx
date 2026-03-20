import { useNavigate } from "react-router-dom";

const FORECAST = [
  { slot: "12:00 - 14:00", load: "Very High", orders: 180 },
  { slot: "14:00 - 17:00", load: "Low", orders: 46 },
  { slot: "18:00 - 21:00", load: "Peak", orders: 220 },
  { slot: "21:00 - 01:00", load: "High", orders: 154 },
];

export default function AdminDemandForecastPage() {
  const navigate = useNavigate();
  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <Header title="Demand Forecast" subtitle="Predicted order volume" onBack={() => navigate("/admin")} />
      <div className="space-y-3">
        {FORECAST.map((row) => (
          <div key={row.slot} className="rounded-2xl border border-border/20 bg-card p-4">
            <div className="text-sm font-bold">{row.slot}</div>
            <div className="text-xs text-muted-foreground mt-1">{row.load} · ~{row.orders} orders</div>
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

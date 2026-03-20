import { useNavigate } from "react-router-dom";

const FORECAST_ROWS = [
  { zone: "Dubai Marina", lunch: 82, dinner: 94, lateNight: 61 },
  { zone: "JLT", lunch: 74, dinner: 88, lateNight: 42 },
  { zone: "Business Bay", lunch: 91, dinner: 79, lateNight: 35 },
  { zone: "Downtown Dubai", lunch: 86, dinner: 92, lateNight: 48 },
  { zone: "JVC", lunch: 63, dinner: 81, lateNight: 52 },
];

export default function AdminDemandForecastPage() {
  const navigate = useNavigate();

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <Header title="Demand Forecast" subtitle="Predicted order volume by zone" onBack={() => navigate("/admin")} />

      <div className="space-y-3">
        {FORECAST_ROWS.map((row) => (
          <div key={row.zone} className="rounded-[28px] border border-border/20 bg-card p-4">
            <div className="text-sm font-bold text-foreground mb-2">{row.zone}</div>
            <div className="flex flex-wrap gap-2">
              <ForecastMetric title="Lunch" value={row.lunch} />
              <ForecastMetric title="Dinner" value={row.dinner} />
              <ForecastMetric title="Late" value={row.lateNight} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ForecastMetric({ title, value }: { title: string; value: number }) {
  const cls = value >= 85 ? "bg-emerald-500/10 text-emerald-500" : value >= 65 ? "bg-amber-500/10 text-amber-500" : "bg-muted text-foreground";
  return (
    <div className="flex flex-col items-center">
      <div className="text-[10px] uppercase font-bold text-muted-foreground">{title}</div>
      <div className={`rounded-full px-3 py-1 text-[11px] font-bold mt-1 ${cls}`}>{value}</div>
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

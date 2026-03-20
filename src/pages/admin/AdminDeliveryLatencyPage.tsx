import { useNavigate } from "react-router-dom";

const LATENCY_ROWS = [
  { zone: "Dubai Marina", pickup: "7m", transit: "16m", total: "23m" },
  { zone: "JLT", pickup: "8m", transit: "18m", total: "26m" },
  { zone: "Business Bay", pickup: "6m", transit: "15m", total: "21m" },
  { zone: "Downtown Dubai", pickup: "9m", transit: "20m", total: "29m" },
];

export default function AdminDeliveryLatencyPage() {
  const navigate = useNavigate();
  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <Header title="Delivery Latency" subtitle="Pickup and transit timing by area" onBack={() => navigate("/admin")} />
      <div className="space-y-3">
        {LATENCY_ROWS.map((row) => (
          <div key={row.zone} className="rounded-[28px] border border-border/20 bg-card p-4">
            <div className="text-sm font-bold">{row.zone}</div>
            <div className="grid grid-cols-3 gap-2 mt-3">
              <MiniMetric title="Pickup" value={row.pickup} />
              <MiniMetric title="Transit" value={row.transit} />
              <MiniMetric title="Total" value={row.total} />
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
      <div>
        <h1 className="text-lg font-bold">{title}</h1>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}

function MiniMetric({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl bg-muted/40 px-3 py-3 text-center">
      <div className="text-[10px] uppercase tracking-wide font-bold text-muted-foreground">{title}</div>
      <div className="text-sm font-bold mt-2">{value}</div>
    </div>
  );
}

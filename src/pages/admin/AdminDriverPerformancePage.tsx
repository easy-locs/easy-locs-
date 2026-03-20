import { useNavigate } from "react-router-dom";

const DRIVERS = [
  { id: "1", name: "Driver A", score: 94, deliveries: 182 },
  { id: "2", name: "Driver B", score: 88, deliveries: 151 },
  { id: "3", name: "Driver C", score: 81, deliveries: 103 },
];

export default function AdminDriverPerformancePage() {
  const navigate = useNavigate();

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/admin")} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">←</button>
        <div>
          <h1 className="text-lg font-bold">Driver Performance</h1>
          <p className="text-xs text-muted-foreground">Scores and delivery counts</p>
        </div>
      </div>
      <div className="space-y-3">
        {DRIVERS.map((d) => (
          <div key={d.id} className="rounded-2xl border border-border/20 bg-card p-4">
            <div className="text-sm font-bold">{d.name}</div>
            <div className="text-xs text-muted-foreground mt-1">Score {d.score} · Deliveries {d.deliveries}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

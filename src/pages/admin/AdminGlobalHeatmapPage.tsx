import { useNavigate } from "react-router-dom";

const AREAS = ["Marina", "JLT", "Business Bay", "Downtown", "JVC"];

export default function AdminGlobalHeatmapPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-[100dvh] bg-background pb-24">
      <div className="flex items-center gap-3 px-4 pt-6 pb-4">
        <button onClick={() => navigate("/admin")} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">←</button>
        <div>
          <h1 className="text-lg font-bold text-foreground">Activity Heatmap</h1>
          <p className="text-xs text-muted-foreground">Live city engagement zones</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 px-4">
        {AREAS.map((area) => (
          <div key={area} className="rounded-2xl border border-border/20 bg-card p-4">
            <div className="text-sm font-bold text-foreground">{area}</div>
            <div className="text-xs text-muted-foreground mt-1">Activity {Math.floor(Math.random() * 100)}%</div>
          </div>
        ))}
      </div>
    </div>
  );
}

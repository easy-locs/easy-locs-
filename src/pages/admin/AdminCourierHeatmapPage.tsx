import { useNavigate } from "react-router-dom";

const HEAT_ROWS = [
  { zone: "Dubai Marina", online: 11, available: 8, pressure: "High" },
  { zone: "JLT", online: 8, available: 5, pressure: "Medium" },
  { zone: "Business Bay", online: 13, available: 9, pressure: "High" },
  { zone: "Downtown Dubai", online: 6, available: 3, pressure: "Critical" },
  { zone: "JVC", online: 7, available: 6, pressure: "Low" },
];

function PressurePill({ value }: { value: string }) {
  const cls =
    value === "Critical"
      ? "bg-destructive/10 text-destructive"
      : value === "High"
      ? "bg-amber-500/10 text-amber-500"
      : value === "Medium"
      ? "bg-primary/10 text-primary"
      : "bg-emerald-500/10 text-emerald-500";

  return <div className={`rounded-full px-3 py-1 text-[11px] font-bold ${cls}`}>{value}</div>;
}

export default function AdminCourierHeatmapPage() {
  const navigate = useNavigate();

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/admin")} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">←</button>
        <div>
          <h1 className="text-lg font-bold">Courier Heatmap</h1>
          <p className="text-xs text-muted-foreground">Driver availability pressure</p>
        </div>
      </div>

      <div className="space-y-3">
        {HEAT_ROWS.map((row) => (
          <div key={row.zone} className="rounded-[28px] border border-border/20 bg-card p-4 flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-bold">{row.zone}</div>
              <div className="text-xs text-muted-foreground mt-1">
                Online {row.online} · Available {row.available}
              </div>
            </div>
            <PressurePill value={row.pressure} />
          </div>
        ))}
      </div>
    </div>
  );
}

import { useNavigate } from "react-router-dom";

const FUEL_ROWS = [
  { label: "This Week", value: "96 AED" },
  { label: "This Month", value: "384 AED" },
  { label: "Average / Day", value: "13 AED" },
];

export default function DriverFuelCostPage() {
  const navigate = useNavigate();

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/driver/dashboard")} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">←</button>
        <div>
          <h1 className="text-lg font-bold">Fuel Costs</h1>
          <p className="text-xs text-muted-foreground">Track transport expenses</p>
        </div>
      </div>

      <div className="space-y-3">
        {FUEL_ROWS.map((row) => (
          <div key={row.label} className="rounded-2xl border border-border/20 bg-card p-4">
            <div className="text-xs text-muted-foreground">{row.label}</div>
            <div className="text-lg font-bold mt-1">{row.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

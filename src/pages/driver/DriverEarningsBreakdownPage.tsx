import { useNavigate } from "react-router-dom";

const EARNINGS = [
  { label: "Base delivery pay", value: "186 AED" },
  { label: "Tips", value: "42 AED" },
  { label: "Peak bonuses", value: "31 AED" },
  { label: "Hot zone boosts", value: "18 AED" },
];

export default function DriverEarningsBreakdownPage() {
  const navigate = useNavigate();

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/driver/dashboard")} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">←</button>
        <div>
          <h1 className="text-lg font-bold">Earnings Breakdown</h1>
          <p className="text-xs text-muted-foreground">Where your income comes from</p>
        </div>
      </div>

      <div className="space-y-3">
        {EARNINGS.map((row) => (
          <div key={row.label} className="rounded-2xl border border-border/20 bg-card p-4">
            <div className="text-xs text-muted-foreground">{row.label}</div>
            <div className="text-lg font-bold mt-1">{row.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

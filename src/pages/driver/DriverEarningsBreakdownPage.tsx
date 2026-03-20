import { useNavigate } from "react-router-dom";

const ROWS = [
  { label: "Base earnings", value: "420 AED" },
  { label: "Bonuses", value: "95 AED" },
  { label: "Tips", value: "38 AED" },
  { label: "Fuel cost", value: "-72 AED" },
];

export default function DriverEarningsBreakdownPage() {
  const navigate = useNavigate();

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <Header title="Earnings Breakdown" subtitle="Income summary" onBack={() => navigate("/driver/dashboard")} />

      <div className="space-y-3">
        {ROWS.map((row) => (
          <div key={row.label} className="rounded-[28px] border border-border/20 bg-card p-4 flex items-center justify-between">
            <div className="text-sm font-semibold">{row.label}</div>
            <div className="text-sm font-bold">{row.value}</div>
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

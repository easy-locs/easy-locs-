import { useNavigate } from "react-router-dom";

const DRIVER_PAYOUTS = [
  { driver: "Ali", amount: 420, status: "pending" },
  { driver: "Omar", amount: 610, status: "paid" },
  { driver: "Hassan", amount: 355, status: "pending" },
];

export default function AdminDriverPayoutsPage() {
  const navigate = useNavigate();
  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <Header title="Driver Payouts" subtitle="Courier settlement queue" onBack={() => navigate("/admin")} />
      <div className="space-y-3">
        {DRIVER_PAYOUTS.map((row) => (
          <div key={row.driver} className="rounded-[28px] border border-border/20 bg-card p-4 flex items-center justify-between">
            <div>
              <div className="text-sm font-bold">{row.driver}</div>
              <div className="text-xs text-muted-foreground mt-1">{row.amount.toFixed(2)} AED</div>
            </div>
            <div className={`rounded-full px-3 py-1 text-[11px] font-bold ${row.status === "paid" ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"}`}>{row.status}</div>
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

import { useNavigate } from "react-router-dom";

const HEALTH = [
  { label: "Orders pipeline", status: "Healthy" },
  { label: "Dispatch engine", status: "Healthy" },
  { label: "Wallet ledger", status: "Healthy" },
  { label: "Support thread", status: "Healthy" },
  { label: "Payments", status: "Watch" },
  { label: "Merchant onboarding", status: "Healthy" },
];

export default function AdminPlatformHealthPage() {
  const navigate = useNavigate();

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <Header title="Platform Health" subtitle="System status overview" onBack={() => navigate("/admin")} />

      <div className="space-y-3">
        {HEALTH.map((row) => (
          <div key={row.label} className="rounded-[28px] border border-border/20 bg-card p-4 flex items-center justify-between gap-3">
            <div className="text-sm font-semibold text-foreground">{row.label}</div>
            <div className={`rounded-full px-3 py-1 text-[11px] font-bold ${row.status === "Healthy" ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"}`}>
              {row.status}
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

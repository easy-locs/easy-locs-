import { useNavigate } from "react-router-dom";

const SLA_ROWS = [
  { name: "Pickup SLA", value: "92%", good: true },
  { name: "Delivery SLA", value: "88%", good: false },
  { name: "Support SLA", value: "95%", good: true },
  { name: "Refund SLA", value: "81%", good: false },
  { name: "Driver Assignment SLA", value: "90%", good: true },
];

export default function AdminSlaMonitorPage() {
  const navigate = useNavigate();

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <Header title="SLA Monitor" subtitle="Service level tracking" onBack={() => navigate("/admin")} />

      <div className="space-y-3">
        {SLA_ROWS.map((row) => (
          <div key={row.name} className="rounded-[28px] border border-border/20 bg-card p-4 flex items-center justify-between gap-3">
            <div className="text-sm font-semibold text-foreground">{row.name}</div>
            <div className={`rounded-full px-3 py-1 text-[11px] font-bold ${row.good ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"}`}>
              {row.value}
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

import { useNavigate } from "react-router-dom";

const KPI = [
  { title: "GMV Today", value: "24,500 AED" },
  { title: "Orders Today", value: "318" },
  { title: "Drivers Online", value: "46" },
  { title: "Merchants Open", value: "91" },
  { title: "Refunds", value: "6" },
  { title: "Support Open", value: "12" },
];

export default function AdminExecutiveOverviewPage() {
  const navigate = useNavigate();

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <Header title="Executive Overview" subtitle="Top-level business snapshot" onBack={() => navigate("/admin")} />

      <div className="grid grid-cols-2 gap-3">
        {KPI.map((row) => (
          <div key={row.title} className="rounded-[28px] border border-border/20 bg-card p-4">
            <div className="text-[11px] uppercase font-bold text-muted-foreground">{row.title}</div>
            <div className="text-lg font-bold mt-1 text-foreground">{row.value}</div>
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

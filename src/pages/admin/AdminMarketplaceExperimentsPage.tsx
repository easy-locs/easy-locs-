import { useNavigate } from "react-router-dom";
import { useState } from "react";

type ExperimentRow = { id: string; name: string; enabled: boolean; impact: string };

export default function AdminMarketplaceExperimentsPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<ExperimentRow[]>([
    { id: "1", name: "Smart recommendations boost", enabled: true, impact: "+4.2% CTR" },
    { id: "2", name: "Fastest sort default", enabled: false, impact: "+2.1% conversion" },
    { id: "3", name: "Hero promo strip v2", enabled: true, impact: "+3.5% sessions" },
    { id: "4", name: "Checkout coupon emphasis", enabled: false, impact: "+1.8% AOV" },
  ]);

  const toggle = (id: string) => {
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, enabled: !row.enabled } : row)));
  };

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <Header title="Marketplace Experiments" subtitle="A/B tests and feature flags" onBack={() => navigate("/admin")} />

      <div className="space-y-3">
        {rows.map((row) => (
          <div key={row.id} className="rounded-[28px] border border-border/20 bg-card p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-foreground">{row.name}</div>
                <div className="text-xs text-muted-foreground mt-1">{row.impact}</div>
              </div>
              <button onClick={() => toggle(row.id)} className="rounded-2xl bg-muted px-3 py-2 text-sm font-bold text-foreground">
                {row.enabled ? "On" : "Off"}
              </button>
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

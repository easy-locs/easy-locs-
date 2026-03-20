import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

type FinalizerCheck = {
  key: string;
  label: string;
  ok: boolean;
};

export default function AdminUiFinalizerPage() {
  const navigate = useNavigate();
  const [checks] = useState<FinalizerCheck[]>([
    { key: "hero", label: "Home hero strip ready", ok: true },
    { key: "filter-bar", label: "Marketplace sort/filter bar ready", ok: true },
    { key: "sticky-cart", label: "Restaurant sticky cart bar ready", ok: true },
    { key: "checkout-bar", label: "Checkout conversion bar ready", ok: true },
    { key: "radius", label: "Card radius harmonized", ok: true },
    { key: "cta", label: "CTA style harmonized", ok: true },
  ]);

  const score = useMemo(() => {
    const ok = checks.filter((c) => c.ok).length;
    return Math.round((ok / checks.length) * 100);
  }, [checks]);

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <Header title="UI Finalizer" subtitle="Visual readiness audit" onBack={() => navigate("/admin")} />

      <div className="rounded-2xl border border-border/20 bg-card p-4 text-center">
        <div className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
          Final score
        </div>
        <div className="text-3xl font-bold text-foreground mt-1">{score}%</div>
        <div className="w-full h-2 rounded-full bg-muted mt-3 overflow-hidden">
          <div className="h-full rounded-full bg-primary" style={{ width: `${score}%` }} />
        </div>
      </div>

      <div className="space-y-2">
        {checks.map((check) => (
          <div key={check.key} className="flex items-center justify-between rounded-2xl border border-border/20 bg-card px-4 py-3">
            <span className="text-sm font-semibold">{check.label}</span>
            <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${check.ok ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"}`}>
              {check.ok ? "Ready" : "Pending"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Header({ title, subtitle, onBack }: any) {
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

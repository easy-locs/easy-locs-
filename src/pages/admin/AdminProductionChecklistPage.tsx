import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

type CheckRow = {
  id: string;
  label: string;
  done: boolean;
};

export default function AdminProductionChecklistPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<CheckRow[]>([
    { id: "1", label: "Marketplace seeded with restaurants", done: true },
    { id: "2", label: "Orders flow connected", done: true },
    { id: "3", label: "Dispatch auto-runner connected", done: true },
    { id: "4", label: "Wallet sync connected", done: true },
    { id: "5", label: "Stripe / payment flow tested", done: false },
    { id: "6", label: "Admin monitoring pages connected", done: true },
    { id: "7", label: "UI Careem polish applied", done: true },
    { id: "8", label: "Go-live QA pass completed", done: false },
  ]);

  const toggle = (id: string) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, done: !r.done } : r)));
  };

  const progress = useMemo(() => {
    const ok = rows.filter((r) => r.done).length;
    return Math.round((ok / rows.length) * 100);
  }, [rows]);

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/admin/master-control")} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">←</button>
        <div>
          <h1 className="text-lg font-bold">Production Checklist</h1>
          <p className="text-xs text-muted-foreground">Go-live readiness items</p>
        </div>
      </div>

      <div className="rounded-2xl border border-border/20 bg-card p-4 text-center">
        <div className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Progress</div>
        <div className="text-3xl font-bold text-foreground mt-1">{progress}%</div>
        <div className="w-full h-2 rounded-full bg-muted mt-3 overflow-hidden">
          <div className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="space-y-2">
        {rows.map((row) => (
          <button
            key={row.id}
            onClick={() => toggle(row.id)}
            className="w-full rounded-2xl border border-border/20 bg-card p-4 text-left active:scale-[0.99] transition-transform"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">{row.label}</p>
              <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${row.done ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"}`}>
                {row.done ? "Done" : "Pending"}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

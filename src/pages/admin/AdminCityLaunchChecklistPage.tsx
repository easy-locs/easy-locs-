import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

type LaunchItem = { id: string; label: string; done: boolean };

export default function AdminCityLaunchChecklistPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<LaunchItem[]>([
    { id: "1", label: "Seed merchants loaded", done: true },
    { id: "2", label: "Menus visible in customer app", done: true },
    { id: "3", label: "Drivers active in zone", done: false },
    { id: "4", label: "Dispatch routing tested", done: true },
    { id: "5", label: "Payments verified", done: false },
    { id: "6", label: "Support team ready", done: true },
    { id: "7", label: "Promo campaigns prepared", done: true },
    { id: "8", label: "Go live final QA", done: false },
  ]);

  const toggle = (id: string) => {
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, done: !row.done } : row)));
  };

  const progress = useMemo(() => {
    const ok = rows.filter((r) => r.done).length;
    return Math.round((ok / rows.length) * 100);
  }, [rows]);

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/admin")} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">←</button>
        <div>
          <h1 className="text-lg font-bold">City Launch Checklist</h1>
          <p className="text-xs text-muted-foreground">Pre-launch readiness tracker</p>
        </div>
      </div>

      <div className="rounded-[28px] border border-border/20 bg-card p-4 text-center">
        <div className="text-xs text-muted-foreground">Readiness</div>
        <div className="text-2xl font-bold mt-1">{progress}%</div>
        <div className="w-full h-3 rounded-full bg-muted mt-3 overflow-hidden">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="space-y-3">
        {rows.map((row) => (
          <button
            key={row.id}
            onClick={() => toggle(row.id)}
            className="w-full rounded-[28px] border border-border/20 bg-card p-4 text-left active:scale-[0.99] transition-transform"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-bold">{row.label}</div>
              <div className={`rounded-full px-3 py-1 text-[11px] font-bold ${row.done ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"}`}>
                {row.done ? "Done" : "Pending"}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

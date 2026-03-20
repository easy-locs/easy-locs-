import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { toast } from "sonner";

type RepeatPlan = {
  id: string;
  title: string;
  frequency: string;
  nextRun: string;
  active: boolean;
};

export default function CustomerAutoRepeatPage() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<RepeatPlan[]>([
    { id: "1", title: "Friday Pizza Dinner", frequency: "Every Friday", nextRun: "2026-03-27", active: true },
    { id: "2", title: "Office Lunch Combo", frequency: "Every Monday", nextRun: "2026-03-23", active: false },
  ]);

  const toggle = (id: string) => {
    setPlans((prev) => prev.map((p) => (p.id === id ? { ...p, active: !p.active } : p)));
    toast.success("Auto-repeat updated");
  };

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/me")} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">←</button>
        <div>
          <h1 className="text-lg font-bold">Auto Repeat</h1>
          <p className="text-xs text-muted-foreground">Recurring order plans</p>
        </div>
      </div>

      <div className="space-y-3">
        {plans.map((row) => (
          <div key={row.id} className="rounded-2xl border border-border/20 bg-card p-4">
            <div className="text-sm font-bold">{row.title}</div>
            <div className="text-xs text-muted-foreground mt-1">{row.frequency} · Next {row.nextRun}</div>
            <button
              onClick={() => toggle(row.id)}
              className={`mt-4 w-full rounded-2xl px-4 py-3 text-sm font-bold ${row.active ? "bg-emerald-500/10 text-emerald-500" : "bg-muted text-foreground"}`}
            >
              {row.active ? "Active" : "Paused"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

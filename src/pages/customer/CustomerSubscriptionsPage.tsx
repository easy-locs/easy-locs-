import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { toast } from "sonner";

export default function CustomerSubscriptionsPage() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState([
    { id: "1", name: "Free Delivery", active: true },
    { id: "2", name: "VIP Pizza Club", active: false },
  ]);

  const toggle = (id: string) => {
    setPlans((p) => p.map((x) => (x.id === id ? { ...x, active: !x.active } : x)));
    toast.success("Subscription updated");
  };

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/me")} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">←</button>
        <div>
          <h1 className="text-lg font-bold">Subscriptions</h1>
          <p className="text-xs text-muted-foreground">Manage your plans</p>
        </div>
      </div>
      <div className="space-y-3">
        {plans.map((p) => (
          <div key={p.id} className="rounded-2xl border border-border/20 bg-card p-4">
            <div className="text-sm font-bold">{p.name}</div>
            <button
              onClick={() => toggle(p.id)}
              className={`mt-3 w-full rounded-xl px-4 py-2.5 text-sm font-bold ${p.active ? "bg-emerald-500/10 text-emerald-500" : "bg-muted text-foreground"}`}
            >
              {p.active ? "Active" : "Inactive"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

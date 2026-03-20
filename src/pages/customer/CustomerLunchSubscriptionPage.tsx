import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { toast } from "sonner";

export default function CustomerLunchSubscriptionPage() {
  const navigate = useNavigate();
  const [days, setDays] = useState("5");
  const [budget, setBudget] = useState("35");
  const [time, setTime] = useState("12:30");

  const save = () => {
    toast.success("Lunch subscription saved");
    navigate("/me");
  };

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <Header title="Lunch Subscription" subtitle="Recurring weekday lunch setup" onBack={() => navigate("/me")} />
      <div className="rounded-[28px] border border-border/20 bg-card p-4 space-y-3">
        <input value={days} onChange={(e) => setDays(e.target.value)} className="w-full rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm" type="number" placeholder="Days per week" />
        <input value={budget} onChange={(e) => setBudget(e.target.value)} className="w-full rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm" type="number" placeholder="Daily budget AED" />
        <input value={time} onChange={(e) => setTime(e.target.value)} className="w-full rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm" type="time" />
        <button onClick={save} className="rounded-2xl bg-primary text-primary-foreground px-4 py-3 text-sm font-bold w-full">Save Subscription</button>
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

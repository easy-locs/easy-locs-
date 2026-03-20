import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { toast } from "sonner";

export default function CustomerScheduledOrderPage() {
  const navigate = useNavigate();
  const [date, setDate] = useState("2026-03-21");
  const [time, setTime] = useState("19:30");
  const [label, setLabel] = useState("Dinner delivery");

  const save = () => {
    toast.success("Scheduled order saved");
    navigate("/checkout");
  };

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <Header title="Scheduled Order" subtitle="Plan a future delivery" onBack={() => navigate("/checkout")} />

      <div className="rounded-[28px] border border-border/20 bg-card p-4 space-y-3">
        <input value={label} onChange={(e) => setLabel(e.target.value)} className="w-full rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm" placeholder="Label" />
        <input value={date} onChange={(e) => setDate(e.target.value)} className="w-full rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm" type="date" />
        <input value={time} onChange={(e) => setTime(e.target.value)} className="w-full rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm" type="time" />
        <button onClick={save} className="rounded-2xl bg-primary text-primary-foreground px-4 py-3 text-sm font-bold w-full">
          Save Scheduled Order
        </button>
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

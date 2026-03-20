import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { toast } from "sonner";

export default function MerchantPrepTimePage() {
  const navigate = useNavigate();
  const [defaultPrepTime, setDefaultPrepTime] = useState("20");
  const [busyPrepTime, setBusyPrepTime] = useState("30");

  const save = () => {
    toast.success("Preparation times saved");
    navigate(-1);
  };

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">←</button>
        <div>
          <h1 className="text-lg font-bold">Preparation Time</h1>
          <p className="text-xs text-muted-foreground">Set average prep duration</p>
        </div>
      </div>
      <div className="rounded-[28px] border border-border/20 bg-card p-4 space-y-3">
        <input value={defaultPrepTime} onChange={(e) => setDefaultPrepTime(e.target.value)} type="number" placeholder="Default prep time min" className="w-full rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm" />
        <input value={busyPrepTime} onChange={(e) => setBusyPrepTime(e.target.value)} type="number" placeholder="Busy prep time min" className="w-full rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm" />
        <button onClick={save} className="w-full rounded-2xl bg-primary text-primary-foreground px-4 py-3 text-sm font-bold">Save Prep Time</button>
      </div>
    </div>
  );
}

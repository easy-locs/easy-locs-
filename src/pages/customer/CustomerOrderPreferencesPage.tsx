import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { toast } from "sonner";

function ToggleCard({ label, value, onToggle }: { label: string; value: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle} className="w-full rounded-[28px] border border-border/20 bg-card p-4 flex items-center justify-between gap-3 text-left">
      <div className="text-sm font-semibold">{label}</div>
      <div className={`rounded-full px-3 py-1 text-[11px] font-bold ${value ? "bg-emerald-500/10 text-emerald-500" : "bg-muted text-foreground"}`}>
        {value ? "On" : "Off"}
      </div>
    </button>
  );
}

export default function CustomerOrderPreferencesPage() {
  const navigate = useNavigate();
  const [cutlery, setCutlery] = useState(false);
  const [contactless, setContactless] = useState(true);
  const [ringBell, setRingBell] = useState(true);
  const [callOnArrival, setCallOnArrival] = useState(false);

  const save = () => {
    toast.success("Order preferences saved");
    navigate("/me");
  };

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/me")} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">←</button>
        <div>
          <h1 className="text-lg font-bold">Order Preferences</h1>
          <p className="text-xs text-muted-foreground">Default checkout behavior</p>
        </div>
      </div>

      <div className="space-y-3">
        <ToggleCard label="Include cutlery" value={cutlery} onToggle={() => setCutlery((v) => !v)} />
        <ToggleCard label="Contactless delivery" value={contactless} onToggle={() => setContactless((v) => !v)} />
        <ToggleCard label="Ring bell" value={ringBell} onToggle={() => setRingBell((v) => !v)} />
        <ToggleCard label="Call on arrival" value={callOnArrival} onToggle={() => setCallOnArrival((v) => !v)} />
      </div>

      <button onClick={save} className="w-full rounded-2xl bg-primary text-primary-foreground px-4 py-3 text-sm font-bold">Save Preferences</button>
    </div>
  );
}

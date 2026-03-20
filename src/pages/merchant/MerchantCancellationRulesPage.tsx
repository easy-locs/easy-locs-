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

export default function MerchantCancellationRulesPage() {
  const navigate = useNavigate();
  const [allowAutoCancel, setAllowAutoCancel] = useState(false);
  const [cutoffMinutes, setCutoffMinutes] = useState("5");
  const [refundMode, setRefundMode] = useState("manual");

  const save = () => {
    toast.success("Cancellation rules saved");
    navigate(-1);
  };

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">←</button>
        <div>
          <h1 className="text-lg font-bold">Cancellation Rules</h1>
          <p className="text-xs text-muted-foreground">Order cancellation policies</p>
        </div>
      </div>

      <div className="rounded-[28px] border border-border/20 bg-card p-4 space-y-3">
        <ToggleCard label="Allow auto cancellation" value={allowAutoCancel} onToggle={() => setAllowAutoCancel((v) => !v)} />
        <input value={cutoffMinutes} onChange={(e) => setCutoffMinutes(e.target.value)} type="number" placeholder="Cutoff minutes" className="w-full rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm" />
        <select value={refundMode} onChange={(e) => setRefundMode(e.target.value)} className="w-full rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm">
          <option value="manual">Manual refund review</option>
          <option value="partial">Partial auto refund</option>
          <option value="full">Full auto refund</option>
        </select>
        <button onClick={save} className="w-full rounded-2xl bg-primary text-primary-foreground px-4 py-3 text-sm font-bold">Save Rules</button>
      </div>
    </div>
  );
}

import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { toast } from "sonner";

export default function MerchantAutoAcceptRulesPage() {
  const navigate = useNavigate();
  const [enabled, setEnabled] = useState(false);
  const [maxAmount, setMaxAmount] = useState("120");
  const [maxItems, setMaxItems] = useState("6");

  const save = () => {
    toast.success("Auto-accept rules saved");
    navigate(-1);
  };

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">←</button>
        <div>
          <h1 className="text-lg font-bold">Auto Accept Rules</h1>
          <p className="text-xs text-muted-foreground">Automatically accept simple orders</p>
        </div>
      </div>

      <div className="rounded-[28px] border border-border/20 bg-card p-4 space-y-3">
        <button
          onClick={() => setEnabled((v) => !v)}
          className="w-full rounded-[28px] border border-border/20 bg-card p-4 flex items-center justify-between gap-3 text-left"
        >
          <div className="text-sm font-semibold">Enable auto accept</div>
          <div className={`rounded-full px-3 py-1 text-[11px] font-bold ${enabled ? "bg-emerald-500/10 text-emerald-500" : "bg-muted text-foreground"}`}>
            {enabled ? "On" : "Off"}
          </div>
        </button>
        <input value={maxAmount} onChange={(e) => setMaxAmount(e.target.value)} type="number" placeholder="Max order amount AED" className="w-full rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm" />
        <input value={maxItems} onChange={(e) => setMaxItems(e.target.value)} type="number" placeholder="Max items count" className="w-full rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm" />
        <button onClick={save} className="w-full rounded-2xl bg-primary text-primary-foreground px-4 py-3 text-sm font-bold">Save Rules</button>
      </div>
    </div>
  );
}

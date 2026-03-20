import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

export default function MerchantRushModePage() {
  const navigate = useNavigate();
  const { merchantId = "" } = useParams();
  const [enabled, setEnabled] = useState(false);
  const [extraMinutes, setExtraMinutes] = useState(10);

  const save = () => {
    toast.success("Rush mode saved");
    navigate(`/merchant/dashboard/${merchantId}`);
  };

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(`/merchant/dashboard/${merchantId}`)} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">←</button>
        <div>
          <h1 className="text-lg font-bold">Rush Mode</h1>
          <p className="text-xs text-muted-foreground">Extra prep time during peak</p>
        </div>
      </div>

      <div className="rounded-2xl border border-border/20 bg-card p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-bold">Enable Rush Mode</div>
            <div className="text-xs text-muted-foreground mt-1">Add prep time automatically during peak traffic</div>
          </div>
          <button
            onClick={() => setEnabled((v) => !v)}
            className={`rounded-full px-3 py-1 text-[11px] font-bold ${enabled ? "bg-emerald-500/10 text-emerald-500" : "bg-muted text-foreground"}`}
          >
            {enabled ? "On" : "Off"}
          </button>
        </div>

        <div className="mt-4">
          <div className="text-xs text-muted-foreground mb-1">Extra prep time (minutes)</div>
          <input type="number" value={extraMinutes} onChange={(e) => setExtraMinutes(Number(e.target.value))} className="w-full rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm" />
        </div>

        <button onClick={save} className="w-full rounded-2xl bg-primary text-primary-foreground px-4 py-3 text-sm font-bold mt-4">Save Rush Mode</button>
      </div>
    </div>
  );
}

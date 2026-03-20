import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

export default function MerchantAutoAcceptPage() {
  const navigate = useNavigate();
  const { merchantId = "" } = useParams();
  const [enabled, setEnabled] = useState(false);
  const [maxPrepTime, setMaxPrepTime] = useState(20);

  const save = () => {
    toast.success("Auto accept settings saved");
    navigate(`/merchant/dashboard/${merchantId}`);
  };

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(`/merchant/dashboard/${merchantId}`)} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">←</button>
        <div>
          <h1 className="text-lg font-bold text-foreground">Auto Accept</h1>
          <p className="text-xs text-muted-foreground">Automatic order acceptance</p>
        </div>
      </div>

      <div className="rounded-2xl border border-border/20 bg-card p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-bold text-foreground">Enable Auto Accept</div>
            <div className="text-xs text-muted-foreground mt-1">
              Orders will be accepted automatically
            </div>
          </div>
          <button
            onClick={() => setEnabled((v) => !v)}
            className={`rounded-full px-4 py-2 text-xs font-bold ${
              enabled ? "bg-emerald-500/10 text-emerald-500" : "bg-muted text-foreground"
            }`}
          >
            {enabled ? "On" : "Off"}
          </button>
        </div>
        <div className="mt-4">
          <div className="text-xs text-muted-foreground mb-1">Max prep time (min)</div>
          <input
            type="number"
            value={maxPrepTime}
            onChange={(e) => setMaxPrepTime(Number(e.target.value))}
            className="w-full rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm"
          />
        </div>
        <button onClick={save} className="w-full rounded-2xl bg-primary text-primary-foreground px-4 py-3 text-sm font-bold mt-4">
          Save Settings
        </button>
      </div>
    </div>
  );
}

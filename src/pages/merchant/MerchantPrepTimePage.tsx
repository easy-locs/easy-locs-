import { useNavigate, useParams } from "react-router-dom";
import { useState } from "react";
import { toast } from "sonner";

export default function MerchantPrepTimePage() {
  const navigate = useNavigate();
  const { merchantId = "" } = useParams();
  const [minutes, setMinutes] = useState(20);

  const save = () => {
    toast.success(`Prep time set to ${minutes} minutes`);
    navigate(`/merchant/dashboard/${merchantId}`);
  };

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(`/merchant/dashboard/${merchantId}`)} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">←</button>
        <div>
          <h1 className="text-lg font-bold">Preparation Time</h1>
          <p className="text-xs text-muted-foreground">Set average prep duration</p>
        </div>
      </div>
      <div className="rounded-2xl border border-border/20 bg-card p-4">
        <div className="text-sm font-bold">Preparation Time</div>
        <input type="number" value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} className="w-full rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm mt-3" />
        <button onClick={save} className="w-full rounded-2xl bg-primary text-primary-foreground px-4 py-3 text-sm font-bold mt-3">Save Prep Time</button>
      </div>
    </div>
  );
}

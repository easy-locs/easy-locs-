import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { toast } from "sonner";

export default function MerchantRushPricingPage() {
  const navigate = useNavigate();
  const [enabled, setEnabled] = useState(false);
  const [markupPercent, setMarkupPercent] = useState("10");

  const save = () => {
    toast.success("Rush pricing saved");
    navigate(-1);
  };

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">←</button>
        <div>
          <h1 className="text-lg font-bold">Rush Pricing</h1>
          <p className="text-xs text-muted-foreground">Dynamic markup during peak</p>
        </div>
      </div>

      <div className="rounded-[28px] border border-border/20 bg-card p-4 space-y-3">
        <button onClick={() => setEnabled((v) => !v)} className="w-full rounded-2xl bg-muted px-4 py-3 text-sm font-bold text-foreground">
          {enabled ? "Rush Pricing On" : "Rush Pricing Off"}
        </button>
        <input value={markupPercent} onChange={(e) => setMarkupPercent(e.target.value)} placeholder="Markup %" className="w-full rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm" type="number" />
        <button onClick={save} className="w-full rounded-2xl bg-primary text-primary-foreground px-4 py-3 text-sm font-bold">Save Rush Pricing</button>
      </div>
    </div>
  );
}

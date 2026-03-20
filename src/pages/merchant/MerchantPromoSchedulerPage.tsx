import { useNavigate, useParams } from "react-router-dom";
import { useState } from "react";
import { toast } from "sonner";

export default function MerchantPromoSchedulerPage() {
  const navigate = useNavigate();
  const { merchantId = "" } = useParams();
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");

  const save = () => {
    toast.success("Promo scheduled");
    navigate(`/merchant/dashboard/${merchantId}`);
  };

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(`/merchant/dashboard/${merchantId}`)} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">←</button>
        <div>
          <h1 className="text-lg font-bold">Promo Scheduler</h1>
          <p className="text-xs text-muted-foreground">Plan marketing offers</p>
        </div>
      </div>
      <div className="rounded-2xl border border-border/20 bg-card p-4 space-y-3">
        <input placeholder="Promo name" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm" />
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm" />
        <button onClick={save} className="w-full rounded-2xl bg-primary text-primary-foreground px-4 py-3 text-sm font-bold">Schedule Promo</button>
      </div>
    </div>
  );
}

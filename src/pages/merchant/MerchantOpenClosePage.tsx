import { useNavigate, useParams } from "react-router-dom";
import { useState } from "react";
import { toast } from "sonner";

export default function MerchantOpenClosePage() {
  const navigate = useNavigate();
  const { merchantId = "" } = useParams();
  const [isOpen, setIsOpen] = useState(true);

  const save = () => {
    toast.success(`Store marked as ${isOpen ? "open" : "closed"}`);
    navigate(`/merchant/dashboard/${merchantId}`);
  };

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(`/merchant/dashboard/${merchantId}`)} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">←</button>
        <div>
          <h1 className="text-lg font-bold">Store Status</h1>
          <p className="text-xs text-muted-foreground">Open or close your shop</p>
        </div>
      </div>

      <div className="rounded-2xl border border-border/20 bg-card p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-bold">Current Status</div>
            <div className="text-xs text-muted-foreground mt-1">Customers will see your store availability</div>
          </div>
          <button
            onClick={() => setIsOpen((v) => !v)}
            className={`rounded-full px-4 py-2 text-xs font-bold ${isOpen ? "bg-emerald-500/10 text-emerald-500" : "bg-destructive/10 text-destructive"}`}
          >
            {isOpen ? "Open" : "Closed"}
          </button>
        </div>
        <button onClick={save} className="w-full rounded-2xl bg-primary text-primary-foreground px-4 py-3 text-sm font-bold mt-4">
          Save Status
        </button>
      </div>
    </div>
  );
}

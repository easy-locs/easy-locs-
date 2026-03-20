import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { toast } from "sonner";

export default function CustomerTippingPage() {
  const navigate = useNavigate();
  const [tip, setTip] = useState(5);

  const applyTip = () => {
    toast.success(`Tip added: ${tip} AED`);
    navigate("/checkout");
  };

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/checkout")} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">←</button>
        <div>
          <h1 className="text-lg font-bold">Add Tip</h1>
          <p className="text-xs text-muted-foreground">Thank your driver</p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[3, 5, 10].map((n) => (
          <button
            key={n}
            onClick={() => setTip(n)}
            className={`rounded-2xl px-4 py-4 text-sm font-bold ${tip === n ? "bg-primary text-primary-foreground" : "bg-card border border-border/20"}`}
          >
            {n} AED
          </button>
        ))}
      </div>
      <button onClick={applyTip} className="w-full rounded-2xl bg-primary text-primary-foreground px-4 py-3 text-sm font-bold">Confirm Tip</button>
    </div>
  );
}

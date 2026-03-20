import { useNavigate, useParams } from "react-router-dom";
import { useState } from "react";
import { toast } from "sonner";

type FeeRow = { id: string; zone: string; fee: number };

export default function MerchantDeliveryFeesPage() {
  const navigate = useNavigate();
  const { merchantId = "" } = useParams();
  const [rows, setRows] = useState<FeeRow[]>([
    { id: "1", zone: "Dubai Marina", fee: 6 },
    { id: "2", zone: "JLT", fee: 5 },
    { id: "3", zone: "Business Bay", fee: 7 },
  ]);

  const updateFee = (id: string, fee: number) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, fee } : r)));
  };

  const save = () => {
    toast.success("Delivery fees saved");
    navigate(`/merchant/dashboard/${merchantId}`);
  };

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(`/merchant/dashboard/${merchantId}`)} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">←</button>
        <div>
          <h1 className="text-lg font-bold">Delivery Fees</h1>
          <p className="text-xs text-muted-foreground">Adjust fees by area</p>
        </div>
      </div>

      <div className="space-y-3">
        {rows.map((row) => (
          <div key={row.id} className="rounded-2xl border border-border/20 bg-card p-4">
            <div className="text-sm font-bold">{row.zone}</div>
            <div className="mt-3 flex items-center gap-2">
              <input type="number" value={row.fee} onChange={(e) => updateFee(row.id, Number(e.target.value))} className="w-full rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm" />
              <div className="text-xs text-muted-foreground min-w-fit">AED</div>
            </div>
          </div>
        ))}
      </div>

      <button onClick={save} className="w-full rounded-2xl bg-primary text-primary-foreground px-4 py-3 text-sm font-bold">Save Fees</button>
    </div>
  );
}

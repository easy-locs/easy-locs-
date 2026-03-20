import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export default function CustomerOfficeLunchPage() {
  const navigate = useNavigate();
  const [company, setCompany] = useState("");
  const [headcount, setHeadcount] = useState(10);
  const [deliveryTime, setDeliveryTime] = useState("13:00");
  const [notes, setNotes] = useState("");

  const save = () => {
    toast.success("Office lunch details saved");
    navigate("/checkout");
  };

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/checkout")} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">←</button>
        <div>
          <h1 className="text-lg font-bold">Office Lunch</h1>
          <p className="text-xs text-muted-foreground">Corporate catering order</p>
        </div>
      </div>

      <div className="space-y-3">
        <input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Company name" className="w-full rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm" />
        <input type="number" value={headcount} onChange={(e) => setHeadcount(Number(e.target.value))} placeholder="Headcount" className="w-full rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm" />
        <input type="time" value={deliveryTime} onChange={(e) => setDeliveryTime(e.target.value)} placeholder="Delivery time" className="w-full rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm" />
        <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Reception, pantry, floor, meeting room..." className="w-full rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm resize-none" />
        <button onClick={save} className="w-full rounded-2xl bg-primary text-primary-foreground px-4 py-3 text-sm font-bold">
          Save Office Lunch
        </button>
      </div>
    </div>
  );
}

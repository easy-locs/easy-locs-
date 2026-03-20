import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { toast } from "sonner";

export default function CustomerPartyOrderPage() {
  const navigate = useNavigate();
  const [guests, setGuests] = useState(10);
  const [occasion, setOccasion] = useState("Birthday");
  const [notes, setNotes] = useState("");

  const save = () => {
    toast.success("Party order details saved");
    navigate("/checkout");
  };

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/checkout")} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">←</button>
        <div>
          <h1 className="text-lg font-bold">Party Order</h1>
          <p className="text-xs text-muted-foreground">Setup event catering</p>
        </div>
      </div>

      <div className="rounded-2xl border border-border/20 bg-card p-4">
        <input type="number" value={guests} onChange={(e) => setGuests(Number(e.target.value))} placeholder="Guest count" className="w-full rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm" />
        <input value={occasion} onChange={(e) => setOccasion(e.target.value)} placeholder="Occasion" className="w-full rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm mt-3" />
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} placeholder="Special requests for the event..." className="w-full rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm mt-3 resize-none" />
        <button onClick={save} className="w-full rounded-2xl bg-primary text-primary-foreground px-4 py-3 text-sm font-bold mt-4">Save Party Order</button>
      </div>
    </div>
  );
}

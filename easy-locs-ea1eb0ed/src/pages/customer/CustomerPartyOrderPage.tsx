import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useUiEngine } from "@/hooks/useUiEngine";

export default function CustomerPartyOrderPage() {
  useUiEngine("customer-customerpartyorderpage");
  const navigate = useNavigate();
  const [guests, setGuests] = useState(15);
  const [budget, setBudget] = useState(600);
  const [notes, setNotes] = useState("");

  const save = () => {
    toast.success("Party order preferences saved");
    navigate("/checkout");
  };

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <Header title="Party Order" subtitle="Setup event catering" onBack={() => navigate("/checkout")} />

      <div className="rounded-[28px] border border-border/20 bg-card p-4 space-y-3">
        <input
          type="number"
          value={guests}
          onChange={(e) => setGuests(Number(e.target.value))}
          placeholder="Guests"
          className="w-full rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm"
        />
        <input
          type="number"
          value={budget}
          onChange={(e) => setBudget(Number(e.target.value))}
          placeholder="Budget"
          className="w-full rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm"
        />
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          placeholder="Serving time, plates, drinks, special requests..."
          className="w-full rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm resize-none"
        />
        <button onClick={save} className="rounded-2xl bg-primary text-primary-foreground px-4 py-3 text-sm font-bold w-full">
          Save Party Order
        </button>
      </div>
    </div>
  );
}

function Header({ title, subtitle, onBack }: { title: string; subtitle: string; onBack: () => void }) {
  return (
    <div className="flex items-center gap-3">
      <button onClick={onBack} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">←</button>
      <div>
        <h1 className="text-lg font-bold">{title}</h1>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}

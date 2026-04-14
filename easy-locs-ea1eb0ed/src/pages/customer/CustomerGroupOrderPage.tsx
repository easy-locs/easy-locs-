import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useUiEngine } from "@/hooks/useUiEngine";

type Guest = { id: string; name: string; budget: number };

export default function CustomerGroupOrderPage() {
  useUiEngine("customer-customergrouporderpage");
  const navigate = useNavigate();
  const [groupName, setGroupName] = useState("Friday Team Lunch");
  const [guests, setGuests] = useState<Guest[]>([
    { id: "1", name: "Ahmed", budget: 35 },
    { id: "2", name: "Sara", budget: 40 },
  ]);
  const [guestName, setGuestName] = useState("");
  const [guestBudget, setGuestBudget] = useState("");

  const addGuest = () => {
    if (!guestName.trim()) return;
    setGuests((prev) => [
      ...prev,
      { id: crypto.randomUUID(), name: guestName.trim(), budget: Number(guestBudget || 0) },
    ]);
    setGuestName("");
    setGuestBudget("");
  };

  const save = () => {
    toast.success("Group order prepared");
    navigate("/checkout");
  };

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <Header title="Group Order" subtitle="Create a shared order" onBack={() => navigate("/checkout")} />

      <div className="rounded-[28px] border border-border/20 bg-card p-4 space-y-3">
        <input value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="Group order name" className="w-full rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm" />
        <div className="text-sm font-bold text-foreground">Add Guest</div>
        <input value={guestName} onChange={(e) => setGuestName(e.target.value)} placeholder="Guest name" className="w-full rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm" />
        <input value={guestBudget} onChange={(e) => setGuestBudget(e.target.value)} placeholder="Budget AED" className="w-full rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm" type="number" />
        <button onClick={addGuest} className="rounded-2xl bg-muted px-4 py-3 text-sm font-bold text-foreground w-full">
          Add Guest
        </button>
      </div>

      <div className="space-y-3">
        {guests.map((guest) => (
          <div key={guest.id} className="rounded-[28px] border border-border/20 bg-card p-4">
            <div className="text-sm font-bold text-foreground">{guest.name}</div>
            <div className="text-xs text-muted-foreground mt-1">Budget {guest.budget.toFixed(2)} AED</div>
          </div>
        ))}
      </div>

      <button onClick={save} className="rounded-2xl bg-primary text-primary-foreground px-4 py-3 text-sm font-bold w-full">
        Save Group Order
      </button>
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

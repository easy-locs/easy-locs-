import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { toast } from "sonner";

export default function CustomerOfficeLunchPage() {
  const navigate = useNavigate();
  const [teamSize, setTeamSize] = useState(12);
  const [budget, setBudget] = useState(350);
  const [notes, setNotes] = useState("");

  const save = () => {
    toast.success("Office lunch setup saved");
    navigate("/checkout");
  };

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/checkout")} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">←</button>
        <div>
          <h1 className="text-lg font-bold">Office Lunch</h1>
          <p className="text-xs text-muted-foreground">Team meal planning</p>
        </div>
      </div>

      <div className="rounded-2xl border border-border/20 bg-card p-4">
        <input type="number" value={teamSize} onChange={(e) => setTeamSize(Number(e.target.value))} placeholder="Team size" className="w-full rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm" />
        <input type="number" value={budget} onChange={(e) => setBudget(Number(e.target.value))} placeholder="Budget" className="w-full rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm mt-3" />
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} placeholder="Preferences, allergies, delivery window..." className="w-full rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm mt-3 resize-none" />
        <button onClick={save} className="w-full rounded-2xl bg-primary text-primary-foreground px-4 py-3 text-sm font-bold mt-4">Save Office Lunch</button>
      </div>
    </div>
  );
}

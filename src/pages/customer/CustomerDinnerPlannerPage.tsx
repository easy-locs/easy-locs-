import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { toast } from "sonner";

export default function CustomerDinnerPlannerPage() {
  const navigate = useNavigate();
  const [date, setDate] = useState("2026-03-22");
  const [time, setTime] = useState("20:00");
  const [guests, setGuests] = useState("4");
  const [theme, setTheme] = useState("family");

  const save = () => {
    toast.success("Dinner planner saved");
    navigate("/checkout");
  };

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/checkout")} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">←</button>
        <div>
          <h1 className="text-lg font-bold">Dinner Planner</h1>
          <p className="text-xs text-muted-foreground">Plan dinner ahead</p>
        </div>
      </div>

      <div className="rounded-[28px] border border-border/20 bg-card p-4 space-y-3">
        <input value={date} onChange={(e) => setDate(e.target.value)} type="date" className="w-full rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm" />
        <input value={time} onChange={(e) => setTime(e.target.value)} type="time" className="w-full rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm" />
        <input value={guests} onChange={(e) => setGuests(e.target.value)} type="number" placeholder="Guests" className="w-full rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm" />
        <select value={theme} onChange={(e) => setTheme(e.target.value)} className="w-full rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm">
          <option value="family">Family</option>
          <option value="friends">Friends</option>
          <option value="office">Office</option>
          <option value="date">Date night</option>
        </select>
        <button onClick={save} className="w-full rounded-2xl bg-primary text-primary-foreground px-4 py-3 text-sm font-bold">Save Dinner Plan</button>
      </div>
    </div>
  );
}

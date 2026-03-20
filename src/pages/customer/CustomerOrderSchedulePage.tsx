import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export default function CustomerOrderSchedulePage() {
  const navigate = useNavigate();
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");

  const save = () => {
    if (!date || !time) {
      toast.error("Select date and time");
      return;
    }
    toast.success("Order scheduled");
    navigate("/checkout");
  };

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/checkout")} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">←</button>
        <div>
          <h1 className="text-lg font-bold">Schedule Order</h1>
          <p className="text-xs text-muted-foreground">Choose delivery time</p>
        </div>
      </div>

      <div className="rounded-2xl border border-border/20 bg-card p-4 space-y-3">
        <label className="block">
          <div className="text-xs text-muted-foreground mb-1">Date</div>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm" />
        </label>
        <label className="block">
          <div className="text-xs text-muted-foreground mb-1">Time</div>
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="w-full rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm" />
        </label>
        <button onClick={save} className="w-full rounded-2xl bg-primary text-primary-foreground px-4 py-3 text-sm font-bold">
          Save Schedule
        </button>
      </div>
    </div>
  );
}

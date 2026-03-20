import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { toast } from "sonner";

export default function DriverShiftSchedulerPage() {
  const navigate = useNavigate();
  const [shift, setShift] = useState("morning");

  const save = () => {
    toast.success("Shift saved");
    navigate("/driver/dashboard");
  };

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/driver/dashboard")} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">←</button>
        <div>
          <h1 className="text-lg font-bold">Shift Scheduler</h1>
          <p className="text-xs text-muted-foreground">Select working hours</p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {["morning", "afternoon", "night"].map((s) => (
          <button
            key={s}
            onClick={() => setShift(s)}
            className={`rounded-2xl px-4 py-4 text-sm font-bold capitalize ${shift === s ? "bg-primary text-primary-foreground" : "bg-card border border-border/20"}`}
          >
            {s}
          </button>
        ))}
      </div>
      <button onClick={save} className="w-full rounded-2xl bg-primary text-primary-foreground px-4 py-3 text-sm font-bold">Save Shift</button>
    </div>
  );
}

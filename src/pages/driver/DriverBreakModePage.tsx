import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export default function DriverBreakModePage() {
  const navigate = useNavigate();
  const [onBreak, setOnBreak] = useState(false);

  const toggle = () => {
    setOnBreak((v) => !v);
    toast.success(onBreak ? "Break ended" : "Break started");
  };

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/driver/dashboard")} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">←</button>
        <div>
          <h1 className="text-lg font-bold">Break Mode</h1>
          <p className="text-xs text-muted-foreground">Pause deliveries temporarily</p>
        </div>
      </div>
      <div className="rounded-2xl border border-border/20 bg-card p-6 text-center">
        <div className="text-sm font-bold">{onBreak ? "On Break" : "Available"}</div>
        <div className="text-xs text-muted-foreground mt-2">
          {onBreak ? "You won't receive new missions" : "You're receiving missions normally"}
        </div>
        <button onClick={toggle} className={`mt-4 w-full rounded-2xl px-4 py-3 text-sm font-bold ${onBreak ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
          {onBreak ? "End Break" : "Start Break"}
        </button>
      </div>
    </div>
  );
}

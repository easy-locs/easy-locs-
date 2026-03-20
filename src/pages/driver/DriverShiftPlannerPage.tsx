import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export default function DriverShiftPlannerPage() {
  const navigate = useNavigate();
  const [startTime, setStartTime] = useState("10:00");
  const [endTime, setEndTime] = useState("22:00");
  const [zone, setZone] = useState("Dubai Marina");

  const save = () => {
    toast.success("Shift plan saved");
    navigate("/driver/dashboard");
  };

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <Header title="Shift Planner" subtitle="Plan your work schedule" onBack={() => navigate("/driver/dashboard")} />

      <div className="rounded-[28px] border border-border/20 bg-card p-4 space-y-3">
        <input value={startTime} onChange={(e) => setStartTime(e.target.value)} className="w-full rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm" type="time" />
        <input value={endTime} onChange={(e) => setEndTime(e.target.value)} className="w-full rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm" type="time" />
        <input value={zone} onChange={(e) => setZone(e.target.value)} className="w-full rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm" />
        <button onClick={save} className="rounded-2xl bg-primary text-primary-foreground px-4 py-3 text-sm font-bold w-full">
          Save Shift
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

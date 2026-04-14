import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useUiEngine } from "@/hooks/useUiEngine";
import SubPageShell from "@/components/layout/SubPageShell";

export default function DriverShiftPage() {
  useUiEngine("driver-drivershiftpage");
  const navigate = useNavigate();
  const [started, setStarted] = useState(false);
  const [startTime, setStartTime] = useState<string | null>(null);

  const startShift = () => {
    const now = new Date().toISOString();
    setStarted(true);
    setStartTime(now);
    toast.success("Shift started");
  };

  const endShift = () => {
    setStarted(false);
    toast.success("Shift ended");
  };

  return (
    <SubPageShell title="Driver Shift" subtitle="Manage working session" onBack={() => navigate("/driver/dashboard")}>
      <div className="space-y-4">
        <p className="text-sm font-bold text-foreground">
          Status: {started ? "On Shift" : "Off Shift"}
        </p>
        {startTime && (
          <p className="text-xs text-muted-foreground">
            Started {new Date(startTime).toLocaleString()}
          </p>
        )}

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={startShift}
            className="rounded-2xl bg-primary text-primary-foreground px-4 py-3 text-sm font-bold"
          >
            Start Shift
          </button>
          <button
            onClick={endShift}
            className="rounded-2xl bg-muted text-foreground px-4 py-3 text-sm font-bold"
          >
            End Shift
          </button>
        </div>
      </div>
    </SubPageShell>
  );
}

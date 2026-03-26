import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export default function DriverShiftPage() {
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
    <div className="app-mobile-page bg-background pb-24">
      <div className="flex items-center gap-3 px-4 pt-6 pb-4">
        <button
          onClick={() => navigate("/driver/dashboard")}
          className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center"
        >
          ←
        </button>
        <div>
          <h1 className="text-lg font-bold text-foreground">Driver Shift</h1>
          <p className="text-xs text-muted-foreground">Manage working session</p>
        </div>
      </div>

      <div className="px-4 space-y-4">
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
    </div>
  );
}

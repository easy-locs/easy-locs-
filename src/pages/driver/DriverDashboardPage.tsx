import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function DriverDashboardPage() {
  const navigate = useNavigate();
  const [online, setOnline] = useState(false);
  const [available, setAvailable] = useState(false);

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/")} className="w-9 h-9 rounded-xl flex items-center justify-center bg-muted text-muted-foreground font-bold">
          ←
        </button>
        <div>
          <h1 className="text-lg font-bold">Driver Dashboard</h1>
          <p className="text-xs text-muted-foreground">Delivery operations</p>
        </div>
      </div>

      <div className="rounded-2xl border border-border/20 bg-card p-4 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold">Online</span>
          <button
            onClick={() => setOnline((v) => !v)}
            className={`rounded-full px-4 py-2 text-xs font-bold transition-colors ${
              online ? "bg-emerald-500/10 text-emerald-400" : "bg-muted text-muted-foreground"
            }`}
          >
            {online ? "Online" : "Offline"}
          </button>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold">Available</span>
          <button
            onClick={() => setAvailable((v) => !v)}
            className={`rounded-full px-4 py-2 text-xs font-bold transition-colors ${
              available ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
            }`}
          >
            {available ? "Available" : "Busy"}
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-border/20 bg-card p-4">
        <div className="text-sm font-bold">Active Mission</div>
        <div className="mt-2 text-sm text-muted-foreground">No active mission</div>
      </div>

      <div className="rounded-2xl border border-border/20 bg-card p-4">
        <div className="text-sm font-bold">Mission History</div>
        <div className="mt-2 text-sm text-muted-foreground">No completed deliveries yet</div>
      </div>

      <div className="rounded-2xl border border-border/20 bg-card p-4">
        <div className="text-sm font-bold">Earnings</div>
        <div className="mt-2 text-sm text-muted-foreground">No earnings data available</div>
      </div>
    </div>
  );
}

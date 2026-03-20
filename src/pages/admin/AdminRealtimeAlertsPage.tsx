import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

export default function AdminRealtimeAlertsPage() {
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState<any[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      setAlerts((prev) => [
        { id: Math.random().toString(), message: "High traffic spike detected" },
        ...prev.slice(0, 10),
      ]);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-[100dvh] bg-background pb-24">
      <div className="flex items-center gap-3 px-4 pt-6 pb-4">
        <button onClick={() => navigate("/admin")} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">←</button>
        <div>
          <h1 className="text-lg font-bold text-foreground">Realtime Alerts</h1>
          <p className="text-xs text-muted-foreground">System warnings & events</p>
        </div>
      </div>

      <div className="px-4 space-y-3">
        {alerts.map((a) => (
          <div key={a.id} className="rounded-2xl border border-border/20 bg-card p-4">
            <div className="text-sm font-bold text-destructive">{a.message}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

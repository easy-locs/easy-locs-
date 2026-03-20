import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { toast } from "sonner";

export default function DriverLiveMissionsPage() {
  const navigate = useNavigate();
  const [missions] = useState([
    { id: "1", pickup: "JLT", drop: "Marina", fee: 12 },
    { id: "2", pickup: "Business Bay", drop: "Downtown", fee: 15 },
  ]);

  return (
    <div className="min-h-[100dvh] bg-background pb-24">
      <div className="flex items-center gap-3 px-4 pt-6 pb-4">
        <button onClick={() => navigate("/driver/dashboard")} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">←</button>
        <div>
          <h1 className="text-lg font-bold text-foreground">Live Missions</h1>
          <p className="text-xs text-muted-foreground">Available deliveries</p>
        </div>
      </div>

      <div className="px-4 space-y-3">
        {missions.map((m) => (
          <div key={m.id} className="rounded-2xl border border-border/20 bg-card p-4">
            <div className="text-sm font-bold text-foreground">{m.pickup} → {m.drop}</div>
            <div className="text-xs text-muted-foreground mt-1">{m.fee} AED</div>
            <button onClick={() => toast.success("Mission accepted")} className="mt-2 w-full rounded-xl bg-primary text-primary-foreground px-4 py-2.5 text-sm font-bold">Accept</button>
          </div>
        ))}
      </div>
    </div>
  );
}

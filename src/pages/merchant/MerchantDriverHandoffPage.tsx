import { useNavigate } from "react-router-dom";

const HANDOFF_ROWS = [
  { order: "8c1a22fd", status: "ready_for_pickup", driver: "Ali", eta: "5 min" },
  { order: "f18d91ae", status: "driver_assigned", driver: "Omar", eta: "7 min" },
  { order: "43aa281b", status: "picked_up", driver: "Hassan", eta: "out" },
];

export default function MerchantDriverHandoffPage() {
  const navigate = useNavigate();

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">←</button>
        <div>
          <h1 className="text-lg font-bold">Driver Handoff</h1>
          <p className="text-xs text-muted-foreground">Pickup and courier handover board</p>
        </div>
      </div>

      <div className="space-y-3">
        {HANDOFF_ROWS.map((row) => (
          <div key={row.order} className="rounded-[28px] border border-border/20 bg-card p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-bold">Order #{row.order}</div>
                <div className="text-xs text-muted-foreground mt-1">Driver {row.driver} · ETA {row.eta}</div>
              </div>
              <div className="rounded-full bg-primary/10 text-primary px-3 py-1 text-[11px] font-bold">{row.status}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

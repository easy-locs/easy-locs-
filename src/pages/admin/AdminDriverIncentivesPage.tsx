import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { toast } from "sonner";

type IncentiveRow = { id: string; zone: string; bonusAed: number; active: boolean };

export default function AdminDriverIncentivesPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<IncentiveRow[]>([
    { id: "1", zone: "Dubai Marina", bonusAed: 12, active: true },
    { id: "2", zone: "Business Bay", bonusAed: 15, active: true },
    { id: "3", zone: "JLT", bonusAed: 8, active: false },
  ]);

  const toggle = (id: string) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, active: !r.active } : r)));
    toast.success("Incentive updated");
  };

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/admin")} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">←</button>
        <div>
          <h1 className="text-lg font-bold">Driver Incentives</h1>
          <p className="text-xs text-muted-foreground">Zone-based bonus management</p>
        </div>
      </div>

      <div className="space-y-3">
        {rows.map((row) => (
          <div key={row.id} className="rounded-[28px] border border-border/20 bg-card p-4 flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-bold">{row.zone}</div>
              <div className="text-xs text-muted-foreground mt-1">Bonus {row.bonusAed.toFixed(2)} AED</div>
            </div>
            <button onClick={() => toggle(row.id)} className="rounded-2xl bg-muted px-3 py-2 text-sm font-bold text-foreground">
              {row.active ? "Active" : "Inactive"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

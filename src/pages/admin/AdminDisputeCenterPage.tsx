import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const DISPUTES = [
  { id: "1", order: "A1001", issue: "Late delivery" },
  { id: "2", order: "A1002", issue: "Wrong item" },
];

export default function AdminDisputeCenterPage() {
  const navigate = useNavigate();

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/admin")} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">←</button>
        <div>
          <h1 className="text-lg font-bold">Dispute Center</h1>
          <p className="text-xs text-muted-foreground">Customer complaints</p>
        </div>
      </div>
      <div className="space-y-3">
        {DISPUTES.map((d) => (
          <div key={d.id} className="rounded-2xl border border-border/20 bg-card p-4">
            <div className="text-sm font-bold">Order {d.order}</div>
            <div className="text-xs text-muted-foreground mt-1">{d.issue}</div>
            <div className="grid grid-cols-2 gap-2 mt-3">
              <button onClick={() => toast.success("Resolved")} className="rounded-2xl bg-primary text-primary-foreground px-4 py-2.5 text-sm font-bold">Resolve</button>
              <button onClick={() => toast.info("Escalated")} className="rounded-2xl bg-muted px-4 py-2.5 text-sm font-bold text-foreground">Escalate</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

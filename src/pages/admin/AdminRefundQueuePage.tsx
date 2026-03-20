import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { toast } from "sonner";

type RefundRow = { id: string; orderCode: string; amount: number; reason: string; status: string };

export default function AdminRefundQueuePage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<RefundRow[]>([
    { id: "1", orderCode: "ORD-2201", amount: 48, reason: "Late delivery", status: "pending" },
    { id: "2", orderCode: "ORD-2202", amount: 72, reason: "Wrong item", status: "pending" },
  ]);

  const act = (id: string, status: "approved" | "rejected") => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    toast.success(`Refund ${status}`);
  };

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/admin")} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">←</button>
        <div>
          <h1 className="text-lg font-bold">Refund Queue</h1>
          <p className="text-xs text-muted-foreground">Pending refund requests</p>
        </div>
      </div>

      <div className="space-y-3">
        {rows.map((row) => (
          <div key={row.id} className="rounded-2xl border border-border/20 bg-card p-4">
            <div className="text-sm font-bold">{row.orderCode}</div>
            <div className="text-xs text-muted-foreground mt-1">{row.amount.toFixed(2)} AED · {row.reason}</div>
            <div className="text-xs text-muted-foreground mt-1">Status: {row.status}</div>
            <div className="flex items-center gap-2 mt-4">
              <button onClick={() => act(row.id, "approved")} className="rounded-2xl bg-primary text-primary-foreground px-4 py-3 text-sm font-bold">Approve</button>
              <button onClick={() => act(row.id, "rejected")} className="rounded-2xl bg-muted px-4 py-3 text-sm font-bold text-foreground">Reject</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

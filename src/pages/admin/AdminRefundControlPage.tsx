import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { toast } from "sonner";

export default function AdminRefundControlPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([
    { id: "1", order: "A1827", amount: 42, status: "pending" },
    { id: "2", order: "A1828", amount: 67, status: "pending" },
  ]);

  const approve = (id: string) => {
    setRows((p) => p.map((r) => (r.id === id ? { ...r, status: "approved" } : r)));
    toast.success("Refund approved");
  };

  const reject = (id: string) => {
    setRows((p) => p.map((r) => (r.id === id ? { ...r, status: "rejected" } : r)));
    toast.success("Refund rejected");
  };

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/admin")} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">←</button>
        <div>
          <h1 className="text-lg font-bold">Refund Control</h1>
          <p className="text-xs text-muted-foreground">Approve or reject refund requests</p>
        </div>
      </div>
      <div className="space-y-3">
        {rows.map((row) => (
          <div key={row.id} className="rounded-2xl border border-border/20 bg-card p-4">
            <div className="text-sm font-bold">Order {row.order}</div>
            <div className="text-xs text-muted-foreground mt-1">{row.amount} AED</div>
            <div className="text-xs text-muted-foreground mt-1 capitalize">{row.status}</div>
            <div className="grid grid-cols-2 gap-2 mt-3">
              <button onClick={() => approve(row.id)} className="rounded-2xl bg-primary text-primary-foreground px-4 py-2.5 text-sm font-bold">Approve</button>
              <button onClick={() => reject(row.id)} className="rounded-2xl bg-muted px-4 py-2.5 text-sm font-bold text-foreground">Reject</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

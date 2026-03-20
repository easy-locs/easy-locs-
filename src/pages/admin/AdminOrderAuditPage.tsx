import { useNavigate } from "react-router-dom";

const AUDIT_ROWS = [
  { id: "1", code: "ORD-1001", event: "Payment captured", time: "10:12" },
  { id: "2", code: "ORD-1001", event: "Driver assigned", time: "10:16" },
  { id: "3", code: "ORD-1002", event: "Refund requested", time: "11:08" },
  { id: "4", code: "ORD-1003", event: "Order completed", time: "11:31" },
];

export default function AdminOrderAuditPage() {
  const navigate = useNavigate();
  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <Header title="Order Audit" subtitle="Event trail for orders" onBack={() => navigate("/admin")} />
      <div className="space-y-3">
        {AUDIT_ROWS.map((row) => (
          <div key={row.id} className="rounded-2xl border border-border/20 bg-card p-4">
            <div className="text-sm font-bold">{row.code}</div>
            <div className="text-xs text-muted-foreground mt-1">{row.event}</div>
            <div className="text-[11px] text-muted-foreground mt-1">{row.time}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Header({ title, subtitle, onBack }: { title: string; subtitle: string; onBack: () => void }) {
  return (
    <div className="flex items-center gap-3">
      <button onClick={onBack} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">←</button>
      <div><h1 className="text-lg font-bold">{title}</h1><p className="text-xs text-muted-foreground">{subtitle}</p></div>
    </div>
  );
}

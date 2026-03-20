import { useNavigate } from "react-router-dom";

export default function AdminCashflowMonitorPage() {
  const navigate = useNavigate();

  const metrics = [
    { title: "Inflows (Today)", value: "24,500 AED" },
    { title: "Outflows (Today)", value: "18,200 AED" },
    { title: "Escrow Held", value: "6,300 AED" },
    { title: "Net Balance", value: "12,800 AED" },
  ];

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/admin")} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">←</button>
        <div>
          <h1 className="text-lg font-bold text-foreground">Cashflow Monitor</h1>
          <p className="text-xs text-muted-foreground">Platform money movement</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {metrics.map((m) => (
          <div key={m.title} className="rounded-2xl border border-border/20 bg-card p-4">
            <div className="text-xs text-muted-foreground">{m.title}</div>
            <div className="text-lg font-bold text-foreground mt-1">{m.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

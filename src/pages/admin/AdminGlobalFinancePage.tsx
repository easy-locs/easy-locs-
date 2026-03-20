import { useNavigate } from "react-router-dom";

export default function AdminGlobalFinancePage() {
  const navigate = useNavigate();

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/admin")} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">←</button>
        <div>
          <h1 className="text-lg font-bold">Global Finance</h1>
          <p className="text-xs text-muted-foreground">Platform revenue overview</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {[
          { title: "Revenue", value: "124K AED" },
          { title: "Fees", value: "18K AED" },
          { title: "Refunds", value: "6K AED" },
          { title: "Net", value: "100K AED" },
        ].map((m) => (
          <div key={m.title} className="rounded-2xl border border-border/20 bg-card p-4">
            <div className="text-xs text-muted-foreground">{m.title}</div>
            <div className="text-lg font-bold mt-1">{m.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

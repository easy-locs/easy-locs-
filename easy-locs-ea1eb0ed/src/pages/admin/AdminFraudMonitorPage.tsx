import { db } from "@/services/db";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

export default function AdminFraudMonitorPage() {
  const navigate = useNavigate();

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin-fraud-monitor"],
    queryFn: async () => {
      const { data, error } = await db
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(300);

      if (error) throw error;

      return ((data ?? []) as any[]).map((o) => ({
        ...o,
        risk:
          (Number(o.total_amount ?? 0) > 500 ? 1 : 0) +
          (o.payment_status === "failed" ? 1 : 0) +
          (o.status === "cancelled" ? 1 : 0),
      }));
    },
    staleTime: 5000,
  });

  return (
    <div className="min-h-[100dvh] bg-background pb-24">
      <div className="flex items-center gap-3 px-4 pt-6 pb-4">
        <button onClick={() => navigate("/admin")} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">←</button>
        <div>
          <h1 className="text-lg font-bold text-foreground">Fraud Monitor</h1>
          <p className="text-xs text-muted-foreground">Risk-scored order overview</p>
        </div>
      </div>

      {isLoading && [1, 2].map((i) => (<div key={i} className="mx-4 mb-3 h-20 rounded-2xl bg-muted animate-pulse" />))}

      {!isLoading && rows.length === 0 && (
        <div className="px-4 py-12 text-center text-sm text-muted-foreground">No orders to analyze</div>
      )}

      {!isLoading && rows.length > 0 && (
        <div className="px-4 space-y-3">
          {rows.slice(0, 40).map((r: any) => (
            <div key={r.id} className="rounded-2xl border border-border/20 bg-card p-4">
              <p className="text-sm font-bold text-foreground">Order #{String(r.id).slice(0, 8)}</p>
              <p className="text-xs text-muted-foreground mt-1">{Number(r.total_amount ?? 0).toFixed(2)} AED</p>
              <span className={`inline-block mt-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${r.risk >= 2 ? "bg-destructive/10 text-destructive" : "bg-emerald-500/10 text-emerald-500"}`}>
                Risk score {r.risk}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

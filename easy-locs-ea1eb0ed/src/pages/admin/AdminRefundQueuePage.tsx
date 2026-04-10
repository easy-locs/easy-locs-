import { db } from "@/services/db";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

export default function AdminRefundQueuePage() {
  const navigate = useNavigate();

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin-refund-queue"],
    queryFn: async () => {
      const { data, error } = await db
        .from("orders")
        .select("*")
        .in("status", ["disputed", "refunded"])
        .order("updated_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as any[];
    },
    staleTime: 10000,
  });

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <Header title="Refund Queue" subtitle="Disputed and refunded orders" onBack={() => navigate("/admin")} />

      {isLoading && [1, 2, 3].map((i) => <div key={i} className="h-24 rounded-[28px] bg-muted animate-pulse" />)}

      {!isLoading && rows.length === 0 && (
        <div className="rounded-[28px] border border-border/20 bg-card p-6 text-center">
          <div className="text-3xl">💸</div>
          <div className="text-base font-bold mt-3">No refunds</div>
          <div className="text-sm text-muted-foreground mt-2">No disputed or refunded orders found</div>
        </div>
      )}

      {!isLoading && rows.length > 0 && (
        <div className="space-y-3">
          {rows.map((row: any) => (
            <div key={row.id} className="rounded-[28px] border border-border/20 bg-card p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-bold text-foreground">Order #{String(row.id).slice(0, 8)}</div>
                  <div className="text-xs text-muted-foreground mt-1">{Number(row.total_amount ?? 0).toFixed(2)} {row.currency ?? "AED"}</div>
                </div>
                <StatusPill status={row.status} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const warn = ["disputed", "refunded"].includes(status);
  return (
    <div className={`rounded-full px-3 py-1 text-[11px] font-bold ${warn ? "bg-amber-500/10 text-amber-500" : "bg-emerald-500/10 text-emerald-500"}`}>
      {status}
    </div>
  );
}

function Header({ title, subtitle, onBack }: { title: string; subtitle: string; onBack: () => void }) {
  return (
    <div className="flex items-center gap-3">
      <button onClick={onBack} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">←</button>
      <div>
        <h1 className="text-lg font-bold">{title}</h1>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}

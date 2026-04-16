import SubPageShell from "@/components/layout/SubPageShell";
import { db } from "@/services/db";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useUiEngine } from "@/hooks/useUiEngine";

export default function AdminFraudDetectionPage() {
  useUiEngine("admin-adminfrauddetectionpage");
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-fraud-detection"],
    queryFn: async () => {
      const [{ data: highOrders }, { data: multiOrders }] = await Promise.all([
        db
          .from("orders")
          .select("id,total_amount,currency,status,customer_user_id,created_at")
          .gt("total_amount", 1000)
          .order("total_amount", { ascending: false })
          .limit(100),
        db
          .from("orders")
          .select("id,total_amount,currency,status,customer_user_id,created_at")
          .in("status", ["disputed", "refunded"])
          .order("created_at", { ascending: false })
          .limit(100),
      ]);
      return {
        highValue: highOrders ?? [],
        flagged: multiOrders ?? [],
      };
    },
    staleTime: 10000,
  });

  return (
    <SubPageShell noContentPad className="bg-background">
      <div className="flex items-center gap-3 px-4 pt-6 pb-4">
        <button onClick={() => navigate("/admin")} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">←</button>
        <div>
          <h1 className="text-lg font-bold text-foreground">Fraud Detection</h1>
          <p className="text-xs text-muted-foreground">High-value and flagged orders</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 px-4 pb-4">
        <Metric title="High Value" value={String(data?.highValue.length ?? 0)} />
        <Metric title="Disputed/Refunded" value={String(data?.flagged.length ?? 0)} />
      </div>

      {isLoading && [1, 2].map((i) => (
        <div key={i} className="mx-4 mb-3 h-16 rounded-2xl bg-muted animate-pulse" />
      ))}

      {!isLoading && (data?.highValue.length ?? 0) > 0 && (
        <div className="px-4 space-y-3">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">High Value Orders ({'>'}1000)</p>
          {(data?.highValue ?? []).map((row: any) => (
            <div key={row.id} className="rounded-2xl border border-destructive/20 bg-card p-4">
              <p className="text-sm font-semibold text-foreground">Order #{String(row.id).slice(0, 8)}</p>
              <p className="text-sm font-bold text-destructive tabular-nums">{Number(row.total_amount ?? 0).toFixed(2)} {row.currency ?? "AED"}</p>
              <p className="text-xs text-muted-foreground">User {String(row.customer_user_id ?? "").slice(0, 8)} · {row.status}</p>
              <p className="text-[0.6875rem] text-muted-foreground/70">{row.created_at ? new Date(row.created_at).toLocaleString() : ""}</p>
            </div>
          ))}
        </div>
      )}
    </SubPageShell>
  );
}

function Metric({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/20 bg-card p-4 text-center">
      <p className="text-[0.6875rem] text-muted-foreground">{title}</p>
      <p className="text-lg font-bold text-foreground">{value}</p>
    </div>
  );
}

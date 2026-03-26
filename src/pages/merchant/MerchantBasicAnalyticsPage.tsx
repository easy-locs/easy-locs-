import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function MerchantBasicAnalyticsPage() {
  const navigate = useNavigate();
  const { merchantId = "" } = useParams();

  const { data, isLoading } = useQuery({
    queryKey: ["merchant-basic-analytics", merchantId],
    queryFn: async () => {
      const [{ data: orders }, { data: reviews }, { data: promos }]: any[] = await Promise.all([
        (supabase as any).from("orders").select("id,total_amount,status,created_at").eq("merchant_id", merchantId).limit(1000),
        (supabase as any).from("reviews").select("*").eq("merchant_id", merchantId).limit(1000),
        (supabase as any).from("seed_merchant_promos").select("*").eq("merchant_id", merchantId).limit(1000),
      ]);

      const rows = orders ?? [];
      return {
        totalOrders: rows.length,
        revenue: rows.reduce((sum: number, row: any) => sum + Number(row.total_amount ?? 0), 0),
        completed: rows.filter((row: any) => ["completed", "delivered"].includes(String(row.status ?? ""))).length,
        cancelled: rows.filter((row: any) => ["cancelled", "refunded", "disputed"].includes(String(row.status ?? ""))).length,
        reviewCount: (reviews ?? []).length,
        avgRating: (reviews ?? []).length > 0
          ? ((reviews ?? []).reduce((sum: number, row: any) => sum + Number(row.rating ?? 0), 0) / (reviews ?? []).length).toFixed(2)
          : "0.00",
        activePromos: (promos ?? []).filter((r: any) => !!r.is_active).length,
      };
    },
    enabled: !!merchantId,
    staleTime: 10000,
  });

  return (
    <div className="app-mobile-page flex flex-col bg-background">
      <header className="flex items-center gap-3 px-4 pt-4 pb-3">
        <button onClick={() => navigate(`/merchant/dashboard/${merchantId}`)} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">←</button>
        <div>
          <h1 className="text-lg font-bold text-foreground">Basic Analytics</h1>
          <p className="text-xs text-muted-foreground">Store performance snapshot</p>
        </div>
      </header>

      {isLoading && [1, 2, 3].map((i) => (
        <div key={i} className="mx-4 mt-3 h-16 rounded-2xl bg-muted animate-pulse" />
      ))}

      {!isLoading && data && (
        <div className="grid grid-cols-2 gap-3 px-4 py-4">
          <Metric title="Orders" value={String(data.totalOrders)} />
          <Metric title="Revenue" value={`${Number(data.revenue).toFixed(2)} AED`} />
          <Metric title="Completed" value={String(data.completed)} />
          <Metric title="Cancelled" value={String(data.cancelled)} />
          <Metric title="Reviews" value={String(data.reviewCount)} />
          <Metric title="Avg Rating" value={data.avgRating} />
          <Metric title="Active Promos" value={String(data.activePromos)} />
        </div>
      )}
    </div>
  );
}

function Metric({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/20 bg-card p-4">
      <p className="text-xs text-muted-foreground">{title}</p>
      <p className="text-lg font-bold text-foreground">{value}</p>
    </div>
  );
}

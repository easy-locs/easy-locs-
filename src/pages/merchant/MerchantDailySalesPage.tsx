import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function MerchantDailySalesPage() {
  const navigate = useNavigate();
  const { merchantId = "" } = useParams();

  const { data, isLoading } = useQuery({
    queryKey: ["merchant-daily-sales", merchantId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("orders")
        .select("id,total_amount,status,created_at")
        .eq("merchant_id", merchantId)
        .order("created_at", { ascending: false })
        .limit(500);

      if (error) throw error;

      const rows = (data ?? []) as any[];
      const byDay: Record<string, { orders: number; sales: number }> = {};

      for (const row of rows) {
        const key = row.created_at
          ? new Date(row.created_at).toISOString().slice(0, 10)
          : "unknown";
        if (!byDay[key]) byDay[key] = { orders: 0, sales: 0 };
        byDay[key].orders += 1;
        byDay[key].sales += Number(row.total_amount ?? 0);
      }

      return Object.entries(byDay)
        .map(([date, stats]) => ({ date, ...stats }))
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 30);
    },
    enabled: !!merchantId,
    staleTime: 10000,
  });

  return (
    <div className="app-mobile-page bg-background pb-24">
      <div className="flex items-center gap-3 px-4 pt-6 pb-4">
        <button
          onClick={() => navigate(`/merchant/dashboard/${merchantId}`)}
          className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center"
        >
          ←
        </button>
        <div>
          <h1 className="text-lg font-bold text-foreground">Daily Sales</h1>
          <p className="text-xs text-muted-foreground">Recent merchant sales by day</p>
        </div>
      </div>

      {isLoading && [1, 2, 3].map((i) => (
        <div key={i} className="mx-4 mb-3 h-20 rounded-2xl bg-muted animate-pulse" />
      ))}

      {!isLoading && (!data || data.length === 0) && (
        <div className="px-4 py-12 text-center text-sm text-muted-foreground">
          No daily sales yet
        </div>
      )}

      {!isLoading && data && data.length > 0 && (
        <div className="px-4 space-y-3">
          {data.map((row) => (
            <div key={row.date} className="rounded-2xl border border-border/20 bg-card p-4">
              <p className="text-sm font-bold text-foreground">{row.date}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Orders {row.orders}
              </p>
              <p className="text-xs text-primary font-semibold mt-1">
                Sales {Number(row.sales).toFixed(2)} AED
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

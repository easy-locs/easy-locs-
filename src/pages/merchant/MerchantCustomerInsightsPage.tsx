import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function MerchantCustomerInsightsPage() {
  const navigate = useNavigate();
  const { merchantId = "" } = useParams();

  const { data, isLoading } = useQuery({
    queryKey: ["merchant-customer-insights", merchantId],
    queryFn: async () => {
      const { data: orders, error } = await (supabase as any)
        .from("orders")
        .select("id,customer_user_id,total_amount,status,created_at")
        .eq("merchant_id", merchantId)
        .limit(2000);
      if (error) throw error;
      const rows = orders ?? [];
      const map = new Map<string, { count: number; spent: number; completed: number }>();
      for (const row of rows as any[]) {
        const userId = String(row.customer_user_id ?? "unknown");
        const current = map.get(userId) ?? { count: 0, spent: 0, completed: 0 };
        current.count += 1;
        current.spent += Number(row.total_amount ?? 0);
        if (["completed", "delivered"].includes(String(row.status ?? ""))) current.completed += 1;
        map.set(userId, current);
      }
      const customers = Array.from(map.entries())
        .map(([userId, stats]) => ({ userId, ...stats }))
        .sort((a, b) => b.spent - a.spent);
      return {
        totalCustomers: customers.length,
        repeatCustomers: customers.filter((c) => c.count > 1).length,
        topCustomers: customers.slice(0, 30),
      };
    },
    enabled: !!merchantId,
    staleTime: 10000,
  });

  return (
    <div className="app-mobile-page bg-background pb-24">
      <div className="flex items-center gap-3 px-4 pt-6 pb-4">
        <button onClick={() => navigate(`/merchant/dashboard/${merchantId}`)} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">←</button>
        <div>
          <h1 className="text-lg font-bold text-foreground">Customer Insights</h1>
          <p className="text-xs text-muted-foreground">Repeat buyers and top customers</p>
        </div>
      </div>
      {isLoading ? (
        <>{[1, 2].map((i) => <div key={i} className="mx-4 mb-3 h-16 rounded-2xl bg-muted animate-pulse" />)}</>
      ) : data ? (
        <>
          <div className="grid grid-cols-2 gap-3 px-4 pb-4">
            <Metric title="Total Customers" value={String(data.totalCustomers)} />
            <Metric title="Repeat Customers" value={String(data.repeatCustomers)} />
          </div>
          <div className="px-4 space-y-3">
            {data.topCustomers.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No customer data yet</p>
            ) : (
              data.topCustomers.map((row) => (
                <div key={row.userId} className="rounded-2xl border border-border/20 bg-card p-4">
                  <p className="text-sm font-semibold text-foreground">User {row.userId.slice(0, 8)}</p>
                  <p className="text-xs text-muted-foreground">Orders {row.count} · Completed {row.completed}</p>
                  <p className="text-xs text-muted-foreground">Spent {Number(row.spent).toFixed(2)} AED</p>
                </div>
              ))
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}

function Metric({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/20 bg-card p-4 text-center">
      <p className="text-[11px] text-muted-foreground">{title}</p>
      <p className="text-lg font-bold text-foreground">{value}</p>
    </div>
  );
}

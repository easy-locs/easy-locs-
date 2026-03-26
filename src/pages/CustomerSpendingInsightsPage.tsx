import { useNavigate } from "react-router-dom";
import { formatMoneyByCountry } from "@/lib/currency-engine";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function CustomerSpendingInsightsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["customer-spending-insights", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("total_amount,status,created_at")
        .eq("customer_user_id", user!.id)
        .limit(1000);

      if (error) throw error;

      const rows = data ?? [];
      const total = rows.reduce((sum: number, row: any) => sum + Number(row.total_amount ?? 0), 0);
      const completed = rows.filter((row: any) =>
        ["completed", "delivered"].includes(String(row.status ?? ""))
      );
      const average = rows.length > 0 ? total / rows.length : 0;

      const monthly = new Map<string, number>();
      for (const row of rows) {
        const key = row.created_at
          ? new Date(row.created_at).toLocaleDateString(undefined, { month: "short", year: "numeric" })
          : "Unknown";
        monthly.set(key, (monthly.get(key) ?? 0) + Number((row as any).total_amount ?? 0));
      }

      return {
        totalSpent: total,
        orderCount: rows.length,
        averageOrder: average,
        monthly: Array.from(monthly.entries()).slice(-6),
      };
    },
    enabled: !!user?.id,
    staleTime: 10000,
  });

  return (
    <div className="app-mobile-page bg-background pb-24">
      <div className="flex items-center gap-3 px-4 pt-6 pb-4">
        <button
          onClick={() => navigate("/me")}
          className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center"
        >
          ←
        </button>
        <div>
          <h1 className="text-lg font-bold text-foreground">Spending Insights</h1>
          <p className="text-xs text-muted-foreground">Your order spending summary</p>
        </div>
      </div>

      {isLoading && [1, 2].map((i) => (
        <div key={i} className="mx-4 mb-3 h-16 rounded-2xl bg-muted animate-pulse" />
      ))}

      {!isLoading && data && (
        <>
          <div className="grid grid-cols-3 gap-3 px-4 pb-4">
            <Metric title="Total Spent" value={formatMoneyByCountry(data.totalSpent, null, "AED")} />
            <Metric title="Orders" value={String(data.orderCount)} />
            <Metric title="Avg Order" value={formatMoneyByCountry(data.averageOrder, null, "AED")} />
          </div>

          <div className="mx-4 rounded-2xl border border-border/20 bg-card p-4 space-y-2">
            <p className="text-sm font-bold text-foreground">Recent Months</p>
            {data.monthly.length === 0 ? (
              <p className="text-xs text-muted-foreground">No data yet</p>
            ) : (
              data.monthly.map(([month, amount]: any) => (
                <div key={month} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{month}</span>
                  <span className="font-bold text-foreground">{formatMoneyByCountry(Number(amount), null, "AED")}</span>
                </div>
              ))
            )}
          </div>
        </>
      )}
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

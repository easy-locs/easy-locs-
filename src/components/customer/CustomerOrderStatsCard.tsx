import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { formatMoneyByCountry } from "@/lib/currency-engine";

export default function CustomerOrderStatsCard() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["customer-order-stats-card", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("status,total_amount")
        .eq("customer_user_id", user!.id)
        .limit(1000);

      if (error) throw error;

      const rows = data ?? [];
      return {
        totalOrders: rows.length,
        activeOrders: rows.filter((r: any) =>
          ["paid", "confirmed", "preparing", "driver_search", "driver_assigned", "picked_up", "on_the_way"].includes(
            String(r.status ?? "")
          )
        ).length,
        completedOrders: rows.filter((r: any) =>
          ["completed", "delivered"].includes(String(r.status ?? ""))
        ).length,
        totalSpent: rows.reduce(
          (sum: number, row: any) => sum + Number(row.total_amount ?? 0),
          0
        ),
      };
    },
    enabled: !!user?.id,
    staleTime: 10000,
  });

  if (!user?.id) return null;

  return (
    <div className="rounded-2xl border border-border/20 bg-card p-4 space-y-3">
      <p className="text-sm font-bold text-foreground">Order Stats</p>

      {isLoading ? (
        <div className="h-16 rounded-xl bg-muted animate-pulse" />
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <MiniMetric title="Total" value={String(data?.totalOrders ?? 0)} />
          <MiniMetric title="Active" value={String(data?.activeOrders ?? 0)} />
          <MiniMetric title="Completed" value={String(data?.completedOrders ?? 0)} />
          <MiniMetric title="Spent" value={`${Number(data?.totalSpent ?? 0).toFixed(2)} AED`} />
        </div>
      )}
    </div>
  );
}

function MiniMetric({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-xl bg-muted/60 p-3">
      <p className="text-[11px] text-muted-foreground">{title}</p>
      <p className="text-sm font-bold text-foreground">{value}</p>
    </div>
  );
}

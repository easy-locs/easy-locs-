import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatMoneyByCountry } from "@/lib/currency-engine";

export default function CustomerInsightsCard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["customer-insights-card", user?.id],
    queryFn: async () => {
      const [{ data: orders }, { data: favorites }, { data: loyalty }] = await Promise.all([
        supabase
          .from("orders")
          .select("id,total_amount,status")
          .eq("customer_user_id", user!.id)
          .limit(500),
        supabase
          .from("user_favorites")
          .select("id")
          .eq("user_id", user!.id)
          .limit(500),
        (supabase as any)
          .from("loyalty_accounts")
          .select("*")
          .eq("user_id", user!.id)
          .maybeSingle(),
      ]);

      const orderRows = orders ?? [];
      return {
        totalOrders: orderRows.length,
        totalSpent: orderRows.reduce(
          (sum: number, row: any) => sum + Number(row.total_amount ?? 0),
          0
        ),
        favorites: (favorites ?? []).length,
        points: Number((loyalty as any)?.points_balance ?? 0),
        tier: (loyalty as any)?.tier ?? "bronze",
      };
    },
    enabled: !!user?.id,
    staleTime: 10000,
  });

  if (!user?.id) return null;
  if (!isLoading && !data) return null;

  return (
    <div className="rounded-2xl border border-border/20 bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-foreground">Customer Insights</p>
          <p className="text-[11px] text-muted-foreground">Your account summary</p>
        </div>
        <button
          onClick={() => navigate("/me")}
          className="text-xs font-bold text-primary"
        >
          Open
        </button>
      </div>

      {isLoading ? (
        <div className="h-12 rounded-xl bg-muted animate-pulse" />
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <MiniMetric title="Orders" value={String(data?.totalOrders ?? 0)} />
          <MiniMetric title="Spent" value={`${Number(data?.totalSpent ?? 0).toFixed(2)} AED`} />
          <MiniMetric title="Favorites" value={String(data?.favorites ?? 0)} />
          <MiniMetric title="Points" value={`${data?.points ?? 0} (${data?.tier})`} />
        </div>
      )}
    </div>
  );
}

function MiniMetric({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-xl bg-muted/50 px-3 py-2">
      <p className="text-[10px] text-muted-foreground">{title}</p>
      <p className="text-xs font-bold text-foreground">{value}</p>
    </div>
  );
}

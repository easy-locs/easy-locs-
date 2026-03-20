import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function AdminGrowthDashboardPage() {
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-growth-dashboard"],
    queryFn: async () => {
      const [{ count: users }, { count: merchants }, { count: orders }, { count: favorites }] =
        await Promise.all([
          supabase.from("profiles").select("*", { count: "exact", head: true }),
          (supabase as any).from("seed_merchants").select("*", { count: "exact", head: true }),
          supabase.from("orders").select("*", { count: "exact", head: true }),
          supabase.from("user_favorites").select("*", { count: "exact", head: true }),
        ]);

      return {
        users: users ?? 0,
        merchants: merchants ?? 0,
        orders: orders ?? 0,
        favorites: favorites ?? 0,
      };
    },
    staleTime: 10000,
  });

  return (
    <div className="min-h-[100dvh] bg-background pb-24">
      <div className="flex items-center gap-3 px-4 pt-6 pb-4">
        <button
          onClick={() => navigate("/admin")}
          className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center"
        >
          ←
        </button>
        <div>
          <h1 className="text-lg font-bold text-foreground">Growth Dashboard</h1>
          <p className="text-xs text-muted-foreground">High level acquisition and activity view</p>
        </div>
      </div>

      {isLoading ? (
        <div className="px-4 space-y-3">
          <div className="h-20 rounded-2xl bg-muted animate-pulse" />
          <div className="h-20 rounded-2xl bg-muted animate-pulse" />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 px-4">
          <Metric title="Users" value={String(data?.users ?? 0)} />
          <Metric title="Merchants" value={String(data?.merchants ?? 0)} />
          <Metric title="Orders" value={String(data?.orders ?? 0)} />
          <Metric title="Favorites" value={String(data?.favorites ?? 0)} />
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

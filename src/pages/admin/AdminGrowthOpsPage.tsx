import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function AdminGrowthOpsPage() {
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-growth-ops"],
    queryFn: async () => {
      const [{ data: favorites }, { data: loyalty }, { data: promos }, { data: searchEvents }] =
        await Promise.all([
          supabase.from("user_favorites").select("id,user_id").limit(1000),
          (supabase as any).from("loyalty_accounts").select("*").limit(1000),
          (supabase as any).from("seed_merchant_promos").select("*").limit(1000),
          supabase
            .from("dino_learning_events")
            .select("id,event_type")
            .eq("event_type", "search_history_saved")
            .limit(1000),
        ]);

      const bronze = (loyalty ?? []).filter((r: any) => r.tier === "bronze").length;
      const silver = (loyalty ?? []).filter((r: any) => r.tier === "silver").length;
      const gold = (loyalty ?? []).filter((r: any) => r.tier === "gold").length;
      const platinum = (loyalty ?? []).filter((r: any) => r.tier === "platinum").length;

      return {
        totalFavorites: (favorites ?? []).length,
        totalLoyaltyAccounts: (loyalty ?? []).length,
        activePromos: (promos ?? []).filter((r: any) => !!r.is_active).length,
        totalSearches: (searchEvents ?? []).length,
        bronze,
        silver,
        gold,
        platinum,
      };
    },
    staleTime: 10000,
  });

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background">
      <header className="flex items-center gap-3 px-4 pt-4 pb-3">
        <button
          onClick={() => navigate("/admin")}
          className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center"
        >
          ←
        </button>
        <div>
          <h1 className="text-lg font-bold text-foreground">Growth Ops</h1>
          <p className="text-xs text-muted-foreground">Retention, favorites, promos and loyalty</p>
        </div>
      </header>

      {isLoading && [1, 2, 3].map((i) => (
        <div key={i} className="mx-4 mt-3 h-16 rounded-2xl bg-muted animate-pulse" />
      ))}

      {!isLoading && data && (
        <>
          <div className="grid grid-cols-2 gap-3 px-4 py-4">
            <Metric title="Favorites" value={String(data.totalFavorites)} />
            <Metric title="Loyalty Accounts" value={String(data.totalLoyaltyAccounts)} />
            <Metric title="Active Promos" value={String(data.activePromos)} />
            <Metric title="Searches" value={String(data.totalSearches)} />
          </div>

          <div className="px-4 pb-24 space-y-2">
            <p className="text-sm font-bold text-foreground">Tier Distribution</p>
            <TierRow label="Bronze" value={data.bronze} />
            <TierRow label="Silver" value={data.silver} />
            <TierRow label="Gold" value={data.gold} />
            <TierRow label="Platinum" value={data.platinum} />
          </div>
        </>
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

function TierRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-card border border-border/20 px-4 py-3">
      <p className="text-sm font-semibold text-foreground">{label}</p>
      <p className="text-sm font-bold text-foreground">{value}</p>
    </div>
  );
}

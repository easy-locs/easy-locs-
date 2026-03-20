import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function HomeAutofillStatusCard() {
  const { data } = useQuery({
    queryKey: ["home-autofill-status"],
    queryFn: async () => {
      const { count } = await (supabase as any)
        .from("seed_merchants")
        .select("*", { count: "exact", head: true })
        .eq("category", "food")
        .eq("is_open", true);

      return {
        openRestaurants: count ?? 0,
      };
    },
    staleTime: 10000,
  });

  return (
    <div className="rounded-2xl border border-border/20 bg-card p-4">
      <div className="text-sm font-bold">Marketplace Status</div>
      <div className="text-xs text-muted-foreground mt-1">
        Open restaurants: {data?.openRestaurants ?? 0}
      </div>
    </div>
  );
}

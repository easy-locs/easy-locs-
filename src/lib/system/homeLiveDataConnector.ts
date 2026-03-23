import { supabase } from "@/integrations/supabase/client";
import { governSeedQuery } from "@/lib/discovery/query-governance";

export async function getHomeLiveSnapshot() {
  let seedQ = (supabase as any)
    .from("seed_merchants")
    .select("*")
    .eq("category", "food")
    .eq("is_open", true)
    .limit(12);
  seedQ = governSeedQuery(seedQ, "home");

  const [{ data: merchants }, { data: promos }, { data: orders }] = await Promise.all([
    seedQ,

    (supabase as any)
      .from("seed_merchant_promos")
      .select("*, seed_merchants(*)")
      .eq("is_active", true)
      .limit(8),

    supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(25),
  ]);

  return {
    featuredMerchants: merchants ?? [],
    activePromos: promos ?? [],
    recentOrders: orders ?? [],
  };
}

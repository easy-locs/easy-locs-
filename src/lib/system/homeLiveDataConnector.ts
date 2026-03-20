import { supabase } from "@/integrations/supabase/client";

export async function getHomeLiveSnapshot() {
  const [{ data: merchants }, { data: promos }, { data: orders }] = await Promise.all([
    (supabase as any)
      .from("marketplace_listings")
      .select("*")
      .eq("category", "food")
      .eq("is_open", true)
      .order("visibility_score", { ascending: false })
      .limit(12),

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

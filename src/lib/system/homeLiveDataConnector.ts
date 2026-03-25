import { supabase } from "@/integrations/supabase/client";
import { governStorefrontQuery } from "@/lib/discovery/query-governance";

export async function getHomeLiveSnapshot() {
  let sfQ = (supabase as any)
    .from("storefront_pages")
    .select("id, name, slug, vertical, category, subcategory, city, rating, banner_url, logo_url, display_priority")
    .eq("vertical", "food")
    .limit(12);
  sfQ = governStorefrontQuery(sfQ, "home");

  const [{ data: merchants }, { data: promos }, { data: orders }] = await Promise.all([
    sfQ,

    (supabase as any)
      .from("seed_merchant_promos")
      .select("*")
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

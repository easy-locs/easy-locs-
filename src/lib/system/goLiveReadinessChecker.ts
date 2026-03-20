import { supabase } from "@/integrations/supabase/client";

export async function getGoLiveReadiness() {
  const [{ count: merchants }, { count: products }, { count: orders }] = await Promise.all([
    (supabase as any)
      .from("seed_merchants")
      .select("*", { count: "exact", head: true })
      .eq("is_open", true),

    (supabase as any)
      .from("seed_products")
      .select("*", { count: "exact", head: true })
      .eq("is_available", true),

    supabase
      .from("orders")
      .select("*", { count: "exact", head: true }),
  ]);

  return {
    openMerchants: merchants ?? 0,
    liveProducts: products ?? 0,
    totalOrders: orders ?? 0,
    ready:
      Number(merchants ?? 0) > 0 &&
      Number(products ?? 0) > 0,
  };
}

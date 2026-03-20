import { supabase } from "@/integrations/supabase/client";

export async function getMerchantDashboardSnapshot(merchantId: string) {
  const [merchantRes, ordersRes, productsRes, promosRes] =
    await Promise.all([
      (supabase as any).from("seed_merchants").select("*").eq("id", merchantId).maybeSingle(),
      (supabase as any)
        .from("orders")
        .select("*")
        .eq("merchant_id", merchantId)
        .order("created_at", { ascending: false })
        .limit(200),
      (supabase as any)
        .from("seed_products")
        .select("*")
        .eq("merchant_id", merchantId)
        .order("sort_order", { ascending: true }),
      (supabase as any)
        .from("seed_merchant_promos")
        .select("*")
        .eq("merchant_id", merchantId)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

  const orderRows = orders ?? [];
  const productRows = products ?? [];
  const promoRows = promos ?? [];

  const grossSales = orderRows.reduce(
    (sum: number, row: any) => sum + Number(row.total_amount ?? 0),
    0
  );

  const activeOrders = orderRows.filter((row: any) =>
    ["paid", "confirmed", "preparing", "driver_search", "driver_assigned", "picked_up", "on_the_way"].includes(
      String(row.status ?? "")
    )
  ).length;

  const completedOrders = orderRows.filter((row: any) =>
    ["completed", "delivered"].includes(String(row.status ?? ""))
  ).length;

  const cancelledOrders = orderRows.filter((row: any) =>
    ["cancelled", "refunded", "disputed"].includes(String(row.status ?? ""))
  ).length;

  const availableProducts = productRows.filter((row: any) => !!row.is_available).length;
  const activePromos = promoRows.filter((row: any) => !!row.is_active).length;

  return {
    merchant: merchant ?? null,
    grossSales,
    activeOrders,
    completedOrders,
    cancelledOrders,
    productCount: productRows.length,
    availableProducts,
    promoCount: promoRows.length,
    activePromos,
    recentOrders: orderRows.slice(0, 10),
    recentPromos: promoRows.slice(0, 5),
  };
}

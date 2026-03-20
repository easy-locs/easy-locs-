import { supabase } from "@/integrations/supabase/client";

export async function getMerchantDashboardSummary(merchantId: string) {
  const [{ data: orders }, { data: payments }] = await Promise.all([
    (supabase as any)
      .from("orders")
      .select("id,status,total_amount,currency,created_at,payment_status")
      .eq("merchant_id", merchantId)
      .order("created_at", { ascending: false })
      .limit(100),
    (supabase as any)
      .from("orders")
      .select("id,total_amount,payment_status,settlement_status,created_at")
      .eq("merchant_id", merchantId)
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  const orderRows = (orders ?? []) as any[];
  const paymentRows = (payments ?? []) as any[];

  return {
    activeOrders: orderRows.filter((o) =>
      ["paid", "confirmed", "preparing", "ready_for_pickup", "driver_search", "driver_assigned", "picked_up", "on_the_way"].includes(String(o.status))
    ).length,
    completedOrders: orderRows.filter((o) => ["completed", "delivered"].includes(String(o.status))).length,
    grossSales: orderRows.reduce((sum, row) => sum + Number(row.total_amount ?? 0), 0),
    capturedPayments: paymentRows.filter((p) => ["captured", "paid"].includes(String(p.payment_status))).length,
    pendingSettlements: paymentRows.filter(
      (p) => (!p.settlement_status || String(p.settlement_status) === "pending") && ["completed", "delivered"].includes(String((p as any).status ?? ""))
    ).length,
  };
}

export async function getMerchantPayments(merchantId: string) {
  const { data, error } = await (supabase as any)
    .from("orders")
    .select("id,total_amount,currency,payment_status,settlement_status,created_at")
    .eq("merchant_id", merchantId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) throw error;
  return (data ?? []) as any[];
}

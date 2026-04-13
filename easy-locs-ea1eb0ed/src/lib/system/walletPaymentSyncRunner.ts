import { db as supabase } from "@/services/db";
import { syncOrderPaymentToEscrow, syncCompletedOrderToSettlement } from "@/lib/system/engineConnectorHub";

export async function runWalletPaymentSync(limit = 50) {
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .order("updated_at", { ascending: true })
    .limit(limit);

  if (error) throw error;

  const results: Array<{ orderId: string; payment: string; settlement: string }> = [];

  for (const order of (data ?? []) as any[]) {
    let payment = "skipped";
    let settlement = "skipped";

    try {
      const a = await syncOrderPaymentToEscrow(order.id);
      payment = a.message;
    } catch (e: any) {
      payment = e.message || "payment sync failed";
    }

    try {
      const b = await syncCompletedOrderToSettlement(order.id);
      settlement = b.message;
    } catch (e: any) {
      settlement = e.message || "settlement sync failed";
    }

    results.push({ orderId: order.id, payment, settlement });
  }

  return results;
}

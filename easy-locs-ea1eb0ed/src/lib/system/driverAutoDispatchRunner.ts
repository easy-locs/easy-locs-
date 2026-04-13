import { db as supabase } from "@/services/db";
import { syncReadyOrderToDriver } from "@/lib/system/engineConnectorHub";

export async function runDriverAutoDispatch(limit = 50) {
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .in("status", ["ready_for_pickup", "driver_search"])
    .order("updated_at", { ascending: true })
    .limit(limit);

  if (error) throw error;

  const results: Array<{ orderId: string; ok: boolean; message: string }> = [];

  for (const order of (data ?? []) as any[]) {
    try {
      const result = await syncReadyOrderToDriver(order.id);
      results.push({ orderId: order.id, ok: result.ok, message: result.message });
    } catch (e: any) {
      results.push({ orderId: order.id, ok: false, message: e.message || "Dispatch failed" });
    }
  }

  return results;
}

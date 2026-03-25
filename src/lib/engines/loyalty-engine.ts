/**
 * Loyalty Engine — Awards points for completed orders, manages tier upgrades.
 */
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;
const POINTS_PER_ORDER = 10;

export async function runLoyaltyScan(limit = 50) {
  // Find completed orders without loyalty points awarded
  const { data: orders } = await db
    .from("orders")
    .select("id, user_id, total_amount, status")
    .eq("status", "completed")
    .limit(limit);

  let awarded = 0, skipped = 0;
  for (const order of orders ?? []) {
    if (!order.user_id) { skipped++; continue; }

    // Check if already awarded
    const { data: existing } = await db
      .from("loyalty_transactions")
      .select("id")
      .eq("reference_id", order.id)
      .eq("user_id", order.user_id)
      .maybeSingle();

    if (existing) { skipped++; continue; }

    const points = Math.max(POINTS_PER_ORDER, Math.floor(Number(order.total_amount ?? 0)));

    await db.from("loyalty_transactions").insert({
      user_id: order.user_id,
      points,
      transaction_type: "earn",
      reference_id: order.id,
      reference_type: "order",
      description: `Points for order ${order.id.slice(0, 8)}`,
    });
    awarded++;
  }

  return { checked: orders?.length ?? 0, awarded, skipped };
}

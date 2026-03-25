/**
 * Live Status Engine — Maintains real-time status snapshots for active entities.
 */
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

export async function runLiveStatusRefresh(limit = 50) {
  // Update active order statuses
  const { data: activeOrders } = await db
    .from("orders")
    .select("id, status, user_id, shop_id, updated_at")
    .in("status", ["pending", "confirmed", "preparing", "ready_for_pickup", "in_delivery"])
    .order("updated_at", { ascending: false })
    .limit(limit);

  let updated = 0;
  for (const order of activeOrders ?? []) {
    await db.from("live_status_snapshots").upsert({
      entity_id: order.id,
      entity_type: "order",
      status_label: order.status,
      user_id: order.user_id,
      updated_at: new Date().toISOString(),
    }, { onConflict: "entity_id,entity_type" });
    updated++;
  }

  // Clean completed statuses older than 1 hour
  const cutoff = new Date(Date.now() - 3600_000).toISOString();
  await db
    .from("live_status_snapshots")
    .delete()
    .in("status_label", ["completed", "cancelled", "refunded"])
    .lt("updated_at", cutoff);

  return { activeOrders: activeOrders?.length ?? 0, updated };
}

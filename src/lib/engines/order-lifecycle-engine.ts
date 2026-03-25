/**
 * Order Lifecycle Engine — Detects stale orders and auto-transitions them.
 */
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;
const STALE_PENDING_HOURS = 24;
const STALE_PREPARING_HOURS = 2;

export async function runOrderLifecycle(limit = 50) {
  const pendingCutoff = new Date(Date.now() - STALE_PENDING_HOURS * 3600_000).toISOString();
  const preparingCutoff = new Date(Date.now() - STALE_PREPARING_HOURS * 3600_000).toISOString();

  // Auto-cancel stale pending orders
  const { data: stalePending } = await db
    .from("orders")
    .select("id")
    .eq("status", "pending")
    .lt("created_at", pendingCutoff)
    .limit(limit);

  let cancelled = 0;
  for (const o of stalePending ?? []) {
    await db.from("orders").update({ status: "cancelled", updated_at: new Date().toISOString() }).eq("id", o.id);
    cancelled++;
  }

  // Alert on stale preparing orders
  const { data: stalePreparing } = await db
    .from("orders")
    .select("id")
    .eq("status", "preparing")
    .lt("updated_at", preparingCutoff)
    .limit(limit);

  let alerted = 0;
  for (const o of stalePreparing ?? []) {
    await db.from("admin_alerts").insert({
      alert_type: "stale_order",
      severity: "medium",
      status: "open",
      title: `Order stuck in preparing: ${o.id.slice(0, 8)}`,
      entity_type: "order",
      entity_id: o.id,
    });
    alerted++;
  }

  return { cancelled, alerted, stalePending: stalePending?.length ?? 0, stalePreparing: stalePreparing?.length ?? 0 };
}

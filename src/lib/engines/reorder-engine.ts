/**
 * Reorder Engine — Processes auto-repeat orders when due.
 */
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

export async function runReorderCheck(limit = 50) {
  const { data: repeats } = await db
    .from("auto_repeat_orders")
    .select("id, user_id, source_order_id, frequency, last_triggered_at, enabled")
    .eq("enabled", true)
    .limit(limit);

  let triggered = 0, skipped = 0;
  for (const r of repeats ?? []) {
    const lastTriggered = r.last_triggered_at ? new Date(r.last_triggered_at) : new Date(0);
    const freqMs = r.frequency === "weekly" ? 7 * 86400_000 : r.frequency === "biweekly" ? 14 * 86400_000 : 30 * 86400_000;

    if (Date.now() - lastTriggered.getTime() < freqMs) { skipped++; continue; }

    // Mark as triggered (actual order creation via UI)
    await db.from("auto_repeat_orders").update({
      last_triggered_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq("id", r.id);

    // Notify user
    if (r.user_id) {
      await db.from("notifications").insert({
        user_id: r.user_id,
        type: "reorder_reminder",
        title: "Time to reorder!",
        body: "Your recurring order is due. Tap to reorder.",
        entity_id: r.source_order_id,
        entity_type: "order",
      });
    }
    triggered++;
  }

  return { checked: repeats?.length ?? 0, triggered, skipped };
}

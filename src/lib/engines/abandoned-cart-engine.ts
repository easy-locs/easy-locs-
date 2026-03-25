/**
 * Abandoned Cart Engine — Detects abandoned carts and triggers recovery notifications.
 */
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;
const ABANDON_THRESHOLD_HOURS = 1;

export async function runAbandonedCartRecovery(limit = 50) {
  const cutoff = new Date(Date.now() - ABANDON_THRESHOLD_HOURS * 3600_000).toISOString();

  const { data: carts } = await db
    .from("abandoned_cart_events")
    .select("id, cart_id, customer_user_id, status, subtotal, item_count")
    .eq("status", "abandoned")
    .lt("created_at", cutoff)
    .not("customer_user_id", "is", null)
    .limit(limit);

  let notified = 0, skipped = 0;
  for (const cart of carts ?? []) {
    // Check if already notified
    const { data: existing } = await db
      .from("notifications")
      .select("id")
      .eq("user_id", cart.customer_user_id)
      .eq("type", "abandoned_cart")
      .eq("entity_id", cart.cart_id)
      .maybeSingle();

    if (existing) { skipped++; continue; }

    await db.from("notifications").insert({
      user_id: cart.customer_user_id,
      type: "abandoned_cart",
      title: "Forgot something?",
      body: `You left ${cart.item_count ?? 0} items in your cart.`,
      entity_id: cart.cart_id,
      entity_type: "cart",
      metadata_json: { subtotal: cart.subtotal },
    });

    await db.from("abandoned_cart_events").update({ status: "notified" }).eq("id", cart.id);
    notified++;
  }

  return { checked: carts?.length ?? 0, notified, skipped };
}

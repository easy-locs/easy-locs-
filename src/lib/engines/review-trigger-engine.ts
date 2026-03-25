/**
 * Review Trigger Engine — Detects completed orders eligible for review, sends notification.
 */
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;
const REVIEW_DELAY_HOURS = 2;

export async function runReviewTrigger(limit = 50) {
  const cutoff = new Date(Date.now() - REVIEW_DELAY_HOURS * 3600_000).toISOString();

  // Find completed orders older than delay, without a review
  const { data: eligible } = await db
    .from("orders")
    .select("id, user_id, shop_id, status, updated_at")
    .eq("status", "completed")
    .lt("updated_at", cutoff)
    .limit(limit);

  let triggered = 0, skipped = 0;
  for (const order of eligible ?? []) {
    if (!order.user_id) { skipped++; continue; }

    // Check if review already exists
    const { data: existing } = await db
      .from("verified_reviews")
      .select("id")
      .eq("order_id", order.id)
      .eq("user_id", order.user_id)
      .maybeSingle();

    if (existing) { skipped++; continue; }

    // Check if we already sent a review notification
    const { data: notifExists } = await db
      .from("notifications")
      .select("id")
      .eq("user_id", order.user_id)
      .eq("type", "review_request")
      .eq("entity_id", order.id)
      .maybeSingle();

    if (notifExists) { skipped++; continue; }

    // Send review request notification
    await db.from("notifications").insert({
      user_id: order.user_id,
      type: "review_request",
      title: "Rate your order",
      body: "How was your experience? Leave a review!",
      entity_id: order.id,
      entity_type: "order",
      metadata_json: { shop_id: order.shop_id },
    });
    triggered++;
  }

  return { eligible: eligible?.length ?? 0, triggered, skipped };
}

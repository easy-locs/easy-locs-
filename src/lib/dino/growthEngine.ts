/**
 * DINO V16 — Growth Engine
 * Auto acquisition + retention + viral loops + retargeting.
 * Uses existing: churn_risk_profiles, abandoned_cart_events, referrals,
 * dino_notifications, dino_learning_events.
 */

import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

// =============================
// TYPES
// =============================

export type UserSegment = "new" | "active" | "at_risk" | "churned";

export interface SegmentResult {
  new: string[];
  active: string[];
  at_risk: string[];
  churned: string[];
}

export interface PromoOffer {
  discount: number;
  message: string;
  templateKey: string;
}

const MAX_CAMPAIGN_BATCH = 50;

// =============================
// 1) USER SEGMENTATION (via churn_risk_profiles)
// =============================

export async function segmentUsers(): Promise<SegmentResult> {
  const segments: SegmentResult = { new: [], active: [], at_risk: [], churned: [] };

  const { data } = await supabase
    .from("churn_risk_profiles")
    .select("entity_id, entity_type, risk_band, churn_score, last_order_at, status")
    .eq("entity_type", "user")
    .limit(500);

  for (const row of data ?? []) {
    const band = row.risk_band ?? "unknown";
    const score = row.churn_score ?? 0;

    if (!row.last_order_at) {
      segments.new.push(row.entity_id);
    } else if (score > 70) {
      segments.churned.push(row.entity_id);
    } else if (score > 40) {
      segments.at_risk.push(row.entity_id);
    } else {
      segments.active.push(row.entity_id);
    }
  }

  return segments;
}

// =============================
// 2) SMART PROMOTIONS
// =============================

export function generatePromo(segment: UserSegment): PromoOffer {
  switch (segment) {
    case "new":
      return { discount: 30, message: "🔥 30% OFF on your first order!", templateKey: "promo_new_user" };
    case "churned":
      return { discount: 25, message: "We miss you! Come back with 25% OFF 🎁", templateKey: "promo_winback" };
    case "at_risk":
      return { discount: 15, message: "⚡ Special offer just for you — 15% OFF today!", templateKey: "promo_retention" };
    case "active":
      return { discount: 10, message: "Thank you for being loyal! Enjoy 10% OFF 🎉", templateKey: "promo_loyalty" };
  }
}

// =============================
// 3) AUTO CAMPAIGNS
// =============================

export async function runCampaigns(): Promise<{ sent: number; segments: Record<string, number> }> {
  const segments = await segmentUsers();
  let totalSent = 0;
  const segmentCounts: Record<string, number> = {};

  for (const [segmentKey, userIds] of Object.entries(segments)) {
    const batch = userIds.slice(0, MAX_CAMPAIGN_BATCH);
    if (!batch.length) continue;

    const promo = generatePromo(segmentKey as UserSegment);

    const notifications = batch.map(uid => ({
      actor_type: "user" as const,
      actor_id: uid,
      channel: segmentKey === "churned" ? "email" : "push",
      template_key: promo.templateKey,
      payload_json: { discount: promo.discount, message: promo.message, segment: segmentKey } as Json,
      status: "pending" as const,
    }));

    const { error } = await supabase.from("dino_notifications").insert(notifications);
    if (!error) {
      totalSent += batch.length;
      segmentCounts[segmentKey] = batch.length;
    }
  }

  return { sent: totalSent, segments: segmentCounts };
}

// =============================
// 4) VIRAL / REFERRAL ENGINE
// =============================

export async function getReferralStats(orgId: string) {
  const { data, count } = await supabase
    .from("referrals")
    .select("id, referral_code, referred_user_id, converted_at", { count: "exact" })
    .eq("referrer_org_id", orgId)
    .limit(100);

  const converted = (data ?? []).filter(r => r.converted_at).length;
  return {
    total: count ?? 0,
    converted,
    conversionRate: count ? converted / count : 0,
  };
}

// =============================
// 5) RETARGETING — ABANDONED CARTS
// =============================

export async function retargetAbandonedCarts(): Promise<number> {
  const { data } = await supabase
    .from("abandoned_cart_events")
    .select("id, customer_user_id, subtotal, item_count")
    .eq("status", "abandoned")
    .not("customer_user_id", "is", null)
    .limit(MAX_CAMPAIGN_BATCH);

  if (!data?.length) return 0;

  const notifications = data
    .filter(c => c.customer_user_id)
    .map(c => ({
      actor_type: "user" as const,
      actor_id: c.customer_user_id!,
      channel: "push" as const,
      template_key: "cart_reminder",
      payload_json: {
        message: "⚡ Your order is waiting — complete it now!",
        itemCount: c.item_count,
        subtotal: c.subtotal,
      } as Json,
      status: "pending" as const,
    }));

  const { error } = await supabase.from("dino_notifications").insert(notifications);
  return error ? 0 : notifications.length;
}

// =============================
// 6) FULL GROWTH LOOP
// =============================

export async function runGrowthEngine(): Promise<{
  campaigns: { sent: number; segments: Record<string, number> };
  retargeted: number;
}> {
  const campaigns = await runCampaigns();
  const retargeted = await retargetAbandonedCarts();

  await supabase.from("dino_learning_events").insert([{
    event_type: "v16_growth_cycle",
    entity_id: "system",
    entity_type: "growth",
    metric: "total_reached",
    metadata_json: { campaigns: campaigns.segments, retargeted } as unknown as Json,
    new_value: campaigns.sent + retargeted,
    previous_value: 0,
  }]);

  return { campaigns, retargeted };
}

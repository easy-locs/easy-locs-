/**
 * DINO V18 — Partner Acceleration Engine
 * Priority partnerships + visibility rewards + loyalty loops.
 * Uses existing: dino_pro_performance, dino_visibility_overrides,
 * dino_notifications, dino_learning_events.
 */

import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { applyBoostOverride, computeSmartBoost } from "./visibilityEngine";

// =============================
// TYPES
// =============================

export type PartnerTier = "standard" | "priority" | "elite";

const TIER_THRESHOLDS = { elite: 85, priority: 65 };
const MAX_REWARDS_PER_CYCLE = 20;
const MAX_CATEGORY_BOOSTS = 5;

// =============================
// 1) PRIORITY PARTNER UPGRADE
// =============================

export async function upgradeToPriorityPro(proId: string, tier: PartnerTier = "priority"): Promise<void> {
  const boostMultiplier = tier === "elite" ? 2.0 : 1.5;
  const badge = tier === "elite" ? "ELITE PARTNER" : "TOP PARTNER";

  const { error: updateErr } = await supabase
    .from("dino_pro_performance")
    .update({
      tier,
      improvements_json: { badge, visibilityBoost: boostMultiplier } as unknown as Json,
      visibility_penalty: false,
    })
    .eq("pro_id", proId);

  if (updateErr) {
    console.error("[PartnerEngine] upgradeToPriorityPro failed:", updateErr);
    throw new Error(`upgradeToPriorityPro: ${updateErr.message} (code: ${updateErr.code}, details: ${updateErr.details})`);
  }

  await applyBoostOverride({
    entityId: proId,
    entityType: "pro",
    multiplier: boostMultiplier,
    reason: `partner_${tier}`,
    durationMs: 7 * 24 * 3600 * 1000,
  });
}

// =============================
// 2) EXCLUSIVITY OUTREACH
// =============================

export async function offerExclusivity(proId: string): Promise<void> {
  const { error } = await supabase.from("dino_notifications").insert({
    actor_type: "pro",
    actor_id: proId,
    channel: "push",
    template_key: "exclusive_offer",
    payload_json: {
      message: "🚀 Exclusive partner offer: priority traffic + badge if you stay active with us!",
    } as Json,
    status: "pending",
  });
  if (error) {
    console.error("[PartnerEngine] offerExclusivity failed:", error);
    throw new Error(`offerExclusivity: ${error.message} (code: ${error.code})`);
  }
}

// =============================
// 3) CATEGORY VISIBILITY BOOST
// =============================

export async function dominateCategory(category: string): Promise<void> {
  await applyBoostOverride({
    entityId: category,
    entityType: "category",
    multiplier: 2.0,
    reason: "category_domination",
    durationMs: 4 * 3600 * 1000, // 4 hours
  });
}

// =============================
// 4) REWARD TOP PROS
// =============================

export async function rewardTopPros(): Promise<number> {
  const { data, error: fetchErr } = await supabase
    .from("dino_pro_performance")
    .select("pro_id, overall_score, tier")
    .order("overall_score", { ascending: false })
    .limit(MAX_REWARDS_PER_CYCLE);

  if (fetchErr) {
    console.error("[PartnerEngine] rewardTopPros fetch failed:", fetchErr);
    throw new Error(`rewardTopPros: ${fetchErr.message} (code: ${fetchErr.code}, details: ${fetchErr.details})`);
  }

  if (!data?.length) return 0;

  let rewarded = 0;
  for (const p of data) {
    const newTier: PartnerTier =
      p.overall_score >= TIER_THRESHOLDS.elite ? "elite" :
      p.overall_score >= TIER_THRESHOLDS.priority ? "priority" : "standard";

    if (newTier === "standard") continue;

    if (p.tier !== newTier) {
      await upgradeToPriorityPro(p.pro_id, newTier);
    }

    const { error: notifErr } = await supabase.from("dino_notifications").insert({
      actor_type: "pro",
      actor_id: p.pro_id,
      channel: "push",
      template_key: "reward",
      payload_json: {
        message: newTier === "elite"
          ? "🏆 You are an ELITE partner — maximum visibility activated!"
          : "⭐ You are a TOP partner — enjoy boosted visibility!",
        tier: newTier,
      } as Json,
      status: "pending",
    });

    if (notifErr) {
      console.error("[PartnerEngine] reward notification failed:", notifErr);
    }

    rewarded++;
  }

  return rewarded;
}

// =============================
// 5) FULL PARTNER ENGINE LOOP
// =============================

const STRATEGIC_CATEGORIES = ["food", "delivery", "grocery", "services"];

export async function runPartnerEngine(): Promise<{
  rewarded: number;
  categoriesBoosted: number;
}> {
  // 1) Reward top performers
  const rewarded = await rewardTopPros();

  // 2) Boost strategic categories
  let categoriesBoosted = 0;
  for (const cat of STRATEGIC_CATEGORIES.slice(0, MAX_CATEGORY_BOOSTS)) {
    await dominateCategory(cat);
    categoriesBoosted++;
  }

  // 3) Record learning
  const { error: learnErr } = await supabase.from("dino_learning_events").insert([{
    event_type: "v18_partner_cycle",
    entity_id: "system",
    entity_type: "partner",
    metric: "rewarded",
    metadata_json: { rewarded, categoriesBoosted } as unknown as Json,
    new_value: rewarded,
    previous_value: 0,
  }]);
  if (learnErr) {
    console.error("[PartnerEngine] learning event insert failed:", learnErr);
  }

  return { rewarded, categoriesBoosted };
}

/**
 * MERCHANDISING ENGINE
 * Automatically decides what to feature: bestsellers, top cards, premium picks, combos.
 * Connected to ranking, quality, and conversion data.
 */

import { supabase } from "@/integrations/supabase/client";
import { computeGlobalContext } from "@/lib/context/global-context-engine";

export interface MerchandisingRow {
  id: string;
  name: string;
  subcategory: string;
  qualityTier: string;
  score: number;
  reason: string;
}

export interface MerchandisingOutput {
  bestSellers: MerchandisingRow[];
  premiumPicks: MerchandisingRow[];
  fastDelivery: MerchandisingRow[];
  openNow: MerchandisingRow[];
  topRated: MerchandisingRow[];
  contextualPicks: MerchandisingRow[];
  computedAt: string;
}

export async function runMerchandisingEngine(country = "AE", city?: string, limit = 10): Promise<MerchandisingOutput> {
  const ctx = computeGlobalContext({ country, city });
  const empty: MerchandisingRow[] = [];

  try {
    let query = (supabase as any)
      .from("seed_merchants")
      .select("id, name, subcategory, quality_tier, global_rank_score, is_open_now, visibility_mode")
      .eq("country_code", country)
      .neq("visibility_mode", "hidden")
      .order("global_rank_score", { ascending: false })
      .limit(200);

    if (city) query = query.eq("city", city);
    const { data: merchants } = await query;

    if (!merchants?.length) {
      return { bestSellers: empty, premiumPicks: empty, fastDelivery: empty, openNow: empty, topRated: empty, contextualPicks: empty, computedAt: new Date().toISOString() };
    }

    const toRow = (m: any, reason: string): MerchandisingRow => ({
      id: m.id, name: m.name || "Unknown",
      subcategory: m.subcategory || "general",
      qualityTier: m.quality_tier || "acceptable",
      score: m.global_rank_score || 0, reason,
    });

    // Best sellers = top ranked
    const bestSellers = merchants.slice(0, limit).map((m: any) => toRow(m, "top_ranked"));

    // Premium picks
    const premiumPicks = merchants
      .filter((m: any) => m.quality_tier === "premium" || m.quality_tier === "good")
      .slice(0, limit)
      .map((m: any) => toRow(m, "premium_quality"));

    // Open now
    const openNow = merchants
      .filter((m: any) => m.is_open_now)
      .slice(0, limit)
      .map((m: any) => toRow(m, "open_now"));

    // Top rated = best quality tier
    const topRated = merchants
      .filter((m: any) => m.quality_tier === "premium")
      .slice(0, limit)
      .map((m: any) => toRow(m, "top_rated"));

    // Contextual picks = matching current time slot recommendations
    const boostedSubs = ctx.recommendedSegments;
    const contextualPicks = merchants
      .filter((m: any) => boostedSubs.includes(m.subcategory))
      .slice(0, limit)
      .map((m: any) => toRow(m, `contextual_${ctx.timeSlot}`));

    return {
      bestSellers, premiumPicks, fastDelivery: openNow.slice(0, 5),
      openNow, topRated, contextualPicks,
      computedAt: new Date().toISOString(),
    };
  } catch (err) {
    console.error("[merchandising] Error:", err);
    return { bestSellers: empty, premiumPicks: empty, fastDelivery: empty, openNow: empty, topRated: empty, contextualPicks: empty, computedAt: new Date().toISOString() };
  }
}

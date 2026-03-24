/**
 * CANONICAL BOOST ENGINE — Single source of truth for all monetization.
 * Handles campaign selection, slot matching, scoring, impression/click tracking.
 * Connected to: taxonomy, geo, currency, canonical UI engine.
 */
import { supabase } from "@/integrations/supabase/client";

// ═══════════════════════════════════════════════════════════
//  TYPES
// ═══════════════════════════════════════════════════════════

export interface BoostCampaign {
  id: string;
  owner_user_id: string;
  entity_id: string;
  entity_type: string;
  campaign_type: string;
  objective: string;
  status: string;
  start_at: string | null;
  end_at: string | null;
  daily_budget: number;
  total_budget: number;
  spent: number;
  currency: string;
  targeting_json: Record<string, any>;
  canonical_vertical: string | null;
  canonical_subcategory: string | null;
  country: string | null;
  city: string | null;
  zone: string | null;
  locale: string | null;
}

export interface BoostCreative {
  id: string;
  campaign_id: string;
  creative_type: string;
  title: string;
  subtitle: string | null;
  image_url: string | null;
  video_url: string | null;
  cta_label: string;
  cta_target: string | null;
  theme_variant: string | null;
  canonical_vertical: string | null;
  canonical_subcategory: string | null;
  locale: string | null;
  status: string;
}

export interface BoostSlot {
  id: string;
  surface: string;
  slot_key: string;
  vertical: string | null;
  subcategory: string | null;
  country: string | null;
  city: string | null;
  zone: string | null;
  position_index: number;
  slot_type: string;
  active: boolean;
  rules_json: Record<string, any>;
}

export interface BoostMatch {
  campaign: BoostCampaign;
  creative: BoostCreative;
  slot: BoostSlot;
  score: number;
}

export interface SlotContext {
  surface: string;
  slotKey: string;
  vertical?: string | null;
  subcategory?: string | null;
  country?: string | null;
  city?: string | null;
  zone?: string | null;
  locale?: string;
  userId?: string | null;
  sessionId?: string;
}

// ═══════════════════════════════════════════════════════════
//  SCORING ALGORITHM
// ═══════════════════════════════════════════════════════════

function scoreCampaignForSlot(
  campaign: BoostCampaign,
  creative: BoostCreative,
  ctx: SlotContext
): number {
  let score = 50; // base

  // Taxonomy match (vertical)
  if (ctx.vertical && campaign.canonical_vertical) {
    if (campaign.canonical_vertical === ctx.vertical) score += 20;
    else score -= 15; // penalize wrong vertical
  }

  // Subcategory match
  if (ctx.subcategory && campaign.canonical_subcategory) {
    if (campaign.canonical_subcategory === ctx.subcategory) score += 15;
  }

  // Geo match
  if (ctx.country && campaign.country) {
    if (campaign.country === ctx.country) score += 10;
    else score -= 20; // hard penalize wrong country
  }
  if (ctx.city && campaign.city) {
    if (campaign.city === ctx.city) score += 10;
  }
  if (ctx.zone && campaign.zone) {
    if (campaign.zone === ctx.zone) score += 5;
  }

  // Budget pacing: campaigns with more remaining budget rank higher
  const budgetRemaining = campaign.total_budget - campaign.spent;
  if (budgetRemaining > 0) {
    score += Math.min(10, budgetRemaining / campaign.total_budget * 10);
  }

  // Creative quality bonus
  if (creative.image_url) score += 5;
  if (creative.subtitle) score += 2;

  // Locale match
  if (ctx.locale && creative.locale && creative.locale === ctx.locale) score += 3;

  return Math.max(0, Math.min(100, score));
}

// ═══════════════════════════════════════════════════════════
//  SLOT RESOLVER — Find best campaigns for a slot
// ═══════════════════════════════════════════════════════════

export async function resolveBoostForSlot(ctx: SlotContext): Promise<BoostMatch | null> {
  try {
    // 1. Find matching slot
    const { data: slots } = await (supabase as any)
      .from("boost_slots")
      .select("*")
      .eq("surface", ctx.surface)
      .eq("slot_key", ctx.slotKey)
      .eq("active", true)
      .limit(1);

    const slot = slots?.[0];
    if (!slot) return null;

    // 2. Find active campaigns with budget remaining
    const now = new Date().toISOString();
    let query = (supabase as any)
      .from("boost_campaigns")
      .select("*")
      .eq("status", "active")
      .lte("start_at", now)
      .gte("end_at", now);

    // Filter by vertical if slot is vertical-specific
    if (slot.vertical) {
      query = query.eq("canonical_vertical", slot.vertical);
    }

    const { data: campaigns } = await query.limit(20);
    if (!campaigns?.length) return null;

    // Filter out budget-exhausted campaigns
    const viable = campaigns.filter((c: any) => {
      if (c.total_budget > 0 && c.spent >= c.total_budget) return false;
      if (c.daily_budget > 0) {
        // Simple daily pacing check
        const daySpent = c.spent / Math.max(1, Math.ceil((new Date(c.end_at).getTime() - new Date(c.start_at).getTime()) / 86400000));
        if (daySpent >= c.daily_budget) return false;
      }
      return true;
    });
    if (!viable.length) return null;

    // 3. Get creatives for viable campaigns
    const campaignIds = viable.map((c: any) => c.id);
    const { data: creatives } = await (supabase as any)
      .from("boost_creatives")
      .select("*")
      .in("campaign_id", campaignIds)
      .eq("status", "active");

    if (!creatives?.length) return null;

    // 4. Score each campaign+creative pair
    const matches: BoostMatch[] = [];
    for (const campaign of viable) {
      const campaignCreatives = creatives.filter((c: any) => c.campaign_id === campaign.id);
      for (const creative of campaignCreatives) {
        const score = scoreCampaignForSlot(campaign, creative, ctx);
        matches.push({ campaign, creative, slot, score });
      }
    }

    // 5. Return highest scoring match
    matches.sort((a, b) => b.score - a.score);
    return matches[0] || null;
  } catch {
    return null; // Never block UX
  }
}

// ═══════════════════════════════════════════════════════════
//  MULTI-SLOT RESOLVER
// ═══════════════════════════════════════════════════════════

export async function resolveBoostsForSurface(
  surface: string,
  ctx: Omit<SlotContext, "surface" | "slotKey">
): Promise<Map<string, BoostMatch>> {
  const results = new Map<string, BoostMatch>();
  try {
    const { data: slots } = await (supabase as any)
      .from("boost_slots")
      .select("*")
      .eq("surface", surface)
      .eq("active", true)
      .order("position_index");

    if (!slots?.length) return results;

    // Get all active campaigns once
    const now = new Date().toISOString();
    const { data: campaigns } = await (supabase as any)
      .from("boost_campaigns")
      .select("*")
      .eq("status", "active")
      .lte("start_at", now)
      .gte("end_at", now)
      .limit(50);

    if (!campaigns?.length) return results;

    // Filter budget-exhausted campaigns
    const viable = campaigns.filter((c: any) => {
      if (c.total_budget > 0 && c.spent >= c.total_budget) return false;
      if (c.daily_budget > 0) {
        const daySpent = c.spent / Math.max(1, Math.ceil((new Date(c.end_at).getTime() - new Date(c.start_at).getTime()) / 86400000));
        if (daySpent >= c.daily_budget) return false;
      }
      return true;
    });
    if (!viable.length) return results;

    const campaignIds = viable.map((c: any) => c.id);
    const { data: creatives } = await (supabase as any)
      .from("boost_creatives")
      .select("*")
      .in("campaign_id", campaignIds)
      .eq("status", "active");

    if (!creatives?.length) return results;

    const usedCampaignIds = new Set<string>();

    for (const slot of slots) {
      const slotCtx: SlotContext = { ...ctx, surface, slotKey: slot.slot_key };
      let bestMatch: BoostMatch | null = null;
      let bestScore = -1;

      for (const campaign of viable) {
        if (usedCampaignIds.has(campaign.id)) continue; // Anti-duplication
        const cCreatives = creatives.filter((c: any) => c.campaign_id === campaign.id);
        for (const creative of cCreatives) {
          const score = scoreCampaignForSlot(campaign, creative, slotCtx);
          if (score > bestScore) {
            bestScore = score;
            bestMatch = { campaign, creative, slot, score };
          }
        }
      }

      if (bestMatch && bestScore > 30) { // Minimum quality threshold
        results.set(slot.slot_key, bestMatch);
        usedCampaignIds.add(bestMatch.campaign.id);
      }
    }
  } catch {
    // Silent
  }
  return results;
}

// ═══════════════════════════════════════════════════════════
//  TRACKING — Impressions, clicks, leads
// ═══════════════════════════════════════════════════════════

const SESSION_KEY = "el_boost_sid";
function getBoostSessionId(): string {
  let sid = sessionStorage.getItem(SESSION_KEY);
  if (!sid) {
    sid = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, sid);
  }
  return sid;
}

const impressionLog = new Set<string>();

export async function trackBoostImpression(match: BoostMatch, userId?: string | null) {
  const key = `${match.campaign.id}:${match.creative.id}:${match.slot.id}`;
  if (impressionLog.has(key)) return;
  impressionLog.add(key);

  try {
    await (supabase as any).from("boost_impressions").insert({
      campaign_id: match.campaign.id,
      creative_id: match.creative.id,
      slot_id: match.slot.id,
      viewer_user_id: userId || null,
      session_id: getBoostSessionId(),
      country: match.campaign.country,
      city: match.campaign.city,
      surface: match.slot.surface,
      entity_id: match.campaign.entity_id,
    });
  } catch { /* silent */ }
}

export async function trackBoostClick(match: BoostMatch, clickType = "cta", userId?: string | null) {
  try {
    await (supabase as any).from("boost_clicks").insert({
      campaign_id: match.campaign.id,
      creative_id: match.creative.id,
      slot_id: match.slot.id,
      viewer_user_id: userId || null,
      session_id: getBoostSessionId(),
      click_type: clickType,
    });
  } catch { /* silent */ }
}

export async function trackBoostLead(
  match: BoostMatch,
  leadType: string,
  opts: { customerId?: string; guestId?: string; contact?: Record<string, any> } = {}
) {
  try {
    await (supabase as any).from("boost_leads").insert({
      campaign_id: match.campaign.id,
      source_surface: match.slot.surface,
      source_slot: match.slot.id,
      lead_type: leadType,
      target_entity_id: match.campaign.entity_id,
      customer_user_id: opts.customerId || null,
      guest_id: opts.guestId || null,
      contact_payload: opts.contact || {},
      canonical_vertical: match.campaign.canonical_vertical,
      canonical_subcategory: match.campaign.canonical_subcategory,
      country: match.campaign.country,
      city: match.campaign.city,
      status: "new",
      score: match.score,
    });
  } catch { /* silent */ }
}

// ═══════════════════════════════════════════════════════════
//  GUARDS
// ═══════════════════════════════════════════════════════════

export function validateCampaign(c: Partial<BoostCampaign>): string[] {
  const errors: string[] = [];
  if (!c.entity_id) errors.push("Entity ID required");
  if (!c.canonical_vertical) errors.push("Vertical required");
  if (!c.total_budget || c.total_budget <= 0) errors.push("Budget must be positive");
  if (!c.start_at) errors.push("Start date required");
  if (!c.end_at) errors.push("End date required");
  if (c.start_at && c.end_at && new Date(c.start_at) >= new Date(c.end_at)) {
    errors.push("End date must be after start date");
  }
  return errors;
}

export function validateCreative(c: Partial<BoostCreative>): string[] {
  const errors: string[] = [];
  if (!c.title) errors.push("Title required");
  if (!c.cta_label) errors.push("CTA label required");
  if (!c.image_url && !c.video_url) errors.push("Image or video required");
  return errors;
}

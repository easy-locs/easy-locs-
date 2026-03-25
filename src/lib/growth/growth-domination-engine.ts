/**
 * Growth Domination Engine — Autonomous growth layer.
 * Modules: Auto-Acquisition, Smart Invitations, SEO Mass, Market Domination.
 * Non-destructive, feature-flagged, modular.
 *
 * COLUMN MAPPING (seed_merchants):
 *  source_key (not source), latitude/longitude (not lat/lng),
 *  logo_image (not logo_url), overall_quality_score (not quality_score),
 *  support_email (not email), owner_claimed (bool, not claimed_by uuid).
 */

import { supabase } from "@/integrations/supabase/client";
import { isPlatformFlagEnabled } from "./feature-flag-registry";
import { platformBus } from "@/lib/shared/platform-bus";

// ──────────────────────────────────────
// LOGGING HELPER
// ──────────────────────────────────────
async function logGrowth(engine: string, action: string, result: string, meta?: Record<string, any>) {
  try {
    await (supabase as any).from("growth_logs").insert({
      engine_name: engine,
      action,
      result,
      metadata_json: meta ?? {},
    });
  } catch {
    // never crash on log failure
  }
}

// ──────────────────────────────────────
// A. AUTO ACQUISITION ENGINE
// ──────────────────────────────────────
export interface AcquisitionTarget {
  name: string;
  source: string; // "google" | "deliveroo" | "booking" | "aggregator"
  category?: string;
  city?: string;
  country?: string;
  lat?: number;
  lng?: number;
  phone?: string;
  website?: string;
  photo_url?: string;
  raw_data?: Record<string, any>;
}

/**
 * Ingest scraped entities into the pipeline as pre-live drafts.
 * Deduplicates by LOWER(name) + city + source_key before insert.
 */
export async function ingestAcquisitionBatch(targets: AcquisitionTarget[]) {
  if (!isPlatformFlagEnabled("enable_growth_scraper")) {
    console.log("[growth] Scraper flag disabled, skipping ingestion");
    return { ingested: 0, skipped: 0 };
  }

  let ingested = 0;
  let skipped = 0;

  for (const target of targets) {
    try {
      // Dedup check using correct columns
      const { data: existing } = await (supabase as any)
        .from("seed_merchants")
        .select("id")
        .ilike("name", target.name)
        .eq("city", target.city ?? "")
        .eq("source_key", target.source)
        .maybeSingle();

      if (existing) {
        skipped++;
        continue;
      }

      // Calculate quality score
      let qualityScore = 0;
      if (target.photo_url) qualityScore += 20;
      if (target.lat && target.lng) qualityScore += 20;
      if (target.phone) qualityScore += 20;
      if (target.category && target.category !== "uncategorized") qualityScore += 20;

      const { error } = await (supabase as any)
        .from("seed_merchants")
        .insert({
          name: target.name,
          source_key: target.source,
          category: target.category ?? "uncategorized",
          city: target.city ?? "",
          country: target.country ?? "",
          latitude: target.lat,
          longitude: target.lng,
          phone: target.phone,
          website: target.website,
          logo_image: target.photo_url,
          visibility_mode: "hidden",
          route_status: "draft",
          overall_quality_score: qualityScore,
          created_at: new Date().toISOString(),
        });

      if (error) {
        await logGrowth("acquisition", "insert_error", "fail", { name: target.name, error: error.message });
        continue;
      }
      ingested++;
    } catch (err: any) {
      // FAILSAFE: skip entity, log error, continue
      await logGrowth("acquisition", "exception", "fail", { name: target.name, error: err?.message });
    }
  }

  await logGrowth("acquisition", "batch_complete", "ok", { ingested, skipped, total: targets.length });
  platformBus.emit("growth:acquisition_batch", { ingested, skipped, total: targets.length }, "growth");
  return { ingested, skipped };
}

// ──────────────────────────────────────
// B. SMART INVITATION ENGINE
// ──────────────────────────────────────
export interface InvitationCandidate {
  merchantId: string;
  name: string;
  phone?: string;
  email?: string;
  city?: string;
  qualityScore?: number;
}

const APP_BASE_URL = "https://easy-locs.lovable.app";

/**
 * Get merchants ready for invitation (quality >= 80, not claimed).
 */
export async function getInvitationCandidates(limit = 50): Promise<InvitationCandidate[]> {
  if (!isPlatformFlagEnabled("enable_smart_invitations")) return [];

  try {
    const { data } = await (supabase as any)
      .from("seed_merchants")
      .select("id, name, phone, support_email, city, overall_quality_score")
      .eq("visibility_mode", "hidden")
      .eq("route_status", "draft")
      .gte("overall_quality_score", 80)
      .eq("owner_claimed", false)
      .order("overall_quality_score", { ascending: false })
      .limit(limit);

    return (data ?? []).map((row: any) => ({
      merchantId: row.id,
      name: row.name,
      phone: row.phone,
      email: row.support_email,
      city: row.city,
      qualityScore: row.overall_quality_score,
    }));
  } catch (err: any) {
    await logGrowth("invitations", "fetch_error", "fail", { error: err?.message });
    return [];
  }
}

/**
 * Generate invitation message for a merchant.
 * Uses APP_BASE_URL — NEVER window.location.
 */
export function buildInvitationMessage(candidate: InvitationCandidate): {
  subject: string;
  body: string;
  activationLink: string;
} {
  const activationLink = `${APP_BASE_URL}/claim/${candidate.merchantId}`;
  return {
    subject: `${candidate.name} — Your store is ready on EasyLocs!`,
    body: `Hi ${candidate.name},\n\nGreat news! Your store is already set up on EasyLocs — photos, menu, and location are ready.\n\nActivate it for FREE and start receiving customers today:\n${activationLink}\n\n0% commission during launch period.\n\nTeam EasyLocs`,
    activationLink,
  };
}

// ──────────────────────────────────────
// C. SEO MASS ENGINE
// ──────────────────────────────────────
export interface SEOPageConfig {
  slug: string;
  citySlug: string;
  categorySlug: string;
  title: string;
  metaDescription: string;
  h1: string;
  entityCount: number;
}

/**
 * Generate SEO page configs — only for live/search_only with quality >= 50.
 */
export async function generateSEOPageConfigs(): Promise<SEOPageConfig[]> {
  if (!isPlatformFlagEnabled("enable_seo_mass")) return [];

  try {
    const { data } = await (supabase as any)
      .from("seed_merchants")
      .select("city, category")
      .in("visibility_mode", ["live", "search_only"])
      .gte("overall_quality_score", 50)
      .not("city", "is", null)
      .not("category", "is", null);

    if (!data?.length) return [];

    const combos = new Map<string, { city: string; category: string; count: number }>();
    for (const row of data) {
      const key = `${row.city}::${row.category}`;
      const existing = combos.get(key);
      if (existing) existing.count++;
      else combos.set(key, { city: row.city, category: row.category, count: 1 });
    }

    const pages: SEOPageConfig[] = [];
    for (const { city, category, count } of combos.values()) {
      if (count < 2) continue;
      const citySlug = city.toLowerCase().replace(/\s+/g, "-");
      const categorySlug = category.toLowerCase().replace(/\s+/g, "-");
      pages.push({
        slug: `/city/${citySlug}/${categorySlug}`,
        citySlug,
        categorySlug,
        title: `Best ${category} in ${city} — EasyLocs`,
        metaDescription: `Discover the top ${count} ${category.toLowerCase()} spots in ${city}. Browse ratings, menus, and book instantly on EasyLocs.`,
        h1: `${category} in ${city}`,
        entityCount: count,
      });
    }

    await logGrowth("seo", "generate_pages", "ok", { count: pages.length });
    return pages.sort((a, b) => b.entityCount - a.entityCount);
  } catch (err: any) {
    await logGrowth("seo", "exception", "fail", { error: err?.message });
    return [];
  }
}

// ──────────────────────────────────────
// D. MARKET DOMINATION LOGIC
// ──────────────────────────────────────
export interface ZoneOpportunity {
  city: string;
  country: string;
  entityCount: number;
  competitorGap: number;
  priority: "high" | "medium" | "low";
}

/**
 * Identify market opportunities: zones with demand but low supply.
 * Auto-flags cities with < 20 merchants for priority scraping.
 */
export async function identifyZoneOpportunities(): Promise<ZoneOpportunity[]> {
  if (!isPlatformFlagEnabled("enable_domination")) return [];

  try {
    const { data } = await (supabase as any)
      .from("seed_merchants")
      .select("city, country");

    if (!data?.length) return [];

    const zones = new Map<string, { city: string; country: string; count: number }>();
    for (const row of data) {
      if (!row.city) continue;
      const key = `${row.city}::${row.country || ""}`;
      const existing = zones.get(key);
      if (existing) existing.count++;
      else zones.set(key, { city: row.city, country: row.country || "", count: 1 });
    }

    const opportunities: ZoneOpportunity[] = [];
    for (const { city, country, count } of zones.values()) {
      const gap = Math.max(0, 100 - count);
      const priority: ZoneOpportunity["priority"] =
        count < 10 ? "high" : count < 50 ? "medium" : "low";
      if (priority !== "low") {
        opportunities.push({ city, country, entityCount: count, competitorGap: gap, priority });
      }
    }

    await logGrowth("domination", "zone_scan", "ok", { zones: opportunities.length });
    return opportunities.sort((a, b) => b.competitorGap - a.competitorGap);
  } catch (err: any) {
    await logGrowth("domination", "exception", "fail", { error: err?.message });
    return [];
  }
}

// ──────────────────────────────────────
// E. GROWTH REPORT (for cockpit)
// ──────────────────────────────────────
export async function getGrowthReport() {
  const [candidates, seoPages, opportunities] = await Promise.all([
    getInvitationCandidates(10),
    generateSEOPageConfigs(),
    identifyZoneOpportunities(),
  ]);

  return {
    timestamp: new Date().toISOString(),
    invitationCandidates: candidates.length,
    seoPages: seoPages.length,
    marketOpportunities: opportunities.length,
    topOpportunities: opportunities.slice(0, 5),
    topSEOPages: seoPages.slice(0, 5),
  };
}

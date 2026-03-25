/**
 * Growth Domination Engine — Autonomous growth layer.
 * Modules: Auto-Acquisition, Smart Invitations, SEO Mass, Market Domination.
 * Non-destructive, feature-flagged, modular.
 */

import { supabase } from "@/integrations/supabase/client";
import { isPlatformFlagEnabled } from "./feature-flag-registry";
import { platformBus } from "@/lib/shared/platform-bus";

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
 * Deduplicates by name+city+source before insert.
 */
export async function ingestAcquisitionBatch(targets: AcquisitionTarget[]) {
  if (!isPlatformFlagEnabled("enable_growth_scraper")) {
    console.log("[growth] Scraper flag disabled, skipping ingestion");
    return { ingested: 0, skipped: 0 };
  }

  let ingested = 0;
  let skipped = 0;

  for (const target of targets) {
    // Dedup check
    const { data: existing } = await (supabase as any)
      .from("seed_merchants")
      .select("id")
      .ilike("name", target.name)
      .eq("city", target.city ?? "")
      .eq("source", target.source)
      .maybeSingle();

    if (existing) {
      skipped++;
      continue;
    }

    const { error } = await (supabase as any)
      .from("seed_merchants")
      .insert({
        name: target.name,
        source: target.source,
        category: target.category ?? "uncategorized",
        city: target.city ?? "",
        country: target.country ?? "",
        lat: target.lat,
        lng: target.lng,
        phone: target.phone,
        website: target.website,
        logo_url: target.photo_url,
        visibility_mode: "hidden",
        route_status: "draft",
        quality_score: 0,
        created_at: new Date().toISOString(),
      });

    if (!error) {
      ingested++;
    }
  }

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
}

/**
 * Get merchants ready for invitation (have data but not claimed).
 */
export async function getInvitationCandidates(limit = 50): Promise<InvitationCandidate[]> {
  if (!isPlatformFlagEnabled("enable_smart_invitations")) return [];

  const { data } = await (supabase as any)
    .from("seed_merchants")
    .select("id, name, phone, email, city")
    .eq("visibility_mode", "hidden")
    .eq("route_status", "draft")
    .gt("quality_score", 30) // minimum quality to invite
    .is("claimed_by", null)
    .order("quality_score", { ascending: false })
    .limit(limit);

  return (data ?? []).map((row: any) => ({
    merchantId: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    city: row.city,
  }));
}

/**
 * Generate invitation message for a merchant.
 */
export function buildInvitationMessage(candidate: InvitationCandidate): {
  subject: string;
  body: string;
  activationLink: string;
} {
  const activationLink = `${window.location.origin}/claim/${candidate.merchantId}`;
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
 * Generate SEO page configs for all city+category combos with data.
 */
export async function generateSEOPageConfigs(): Promise<SEOPageConfig[]> {
  if (!isPlatformFlagEnabled("enable_seo_mass")) return [];

  const { data } = await (supabase as any)
    .from("seed_merchants")
    .select("city, category")
    .in("visibility_mode", ["live", "search_only"])
    .not("city", "is", null)
    .not("category", "is", null);

  if (!data?.length) return [];

  // Aggregate by city+category
  const combos = new Map<string, { city: string; category: string; count: number }>();
  for (const row of data) {
    const key = `${row.city}::${row.category}`;
    const existing = combos.get(key);
    if (existing) {
      existing.count++;
    } else {
      combos.set(key, { city: row.city, category: row.category, count: 1 });
    }
  }

  const pages: SEOPageConfig[] = [];
  for (const { city, category, count } of combos.values()) {
    if (count < 2) continue; // need at least 2 entities for a page

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

  return pages.sort((a, b) => b.entityCount - a.entityCount);
}

// ──────────────────────────────────────
// D. MARKET DOMINATION LOGIC
// ──────────────────────────────────────
export interface ZoneOpportunity {
  city: string;
  country: string;
  entityCount: number;
  competitorGap: number; // estimated missing entities
  priority: "high" | "medium" | "low";
}

/**
 * Identify market opportunities: zones with demand but low supply.
 */
export async function identifyZoneOpportunities(): Promise<ZoneOpportunity[]> {
  if (!isPlatformFlagEnabled("enable_domination")) return [];

  const { data } = await (supabase as any)
    .from("seed_merchants")
    .select("city, country");

  if (!data?.length) return [];

  const zones = new Map<string, { city: string; country: string; count: number }>();
  for (const row of data) {
    const key = `${row.city}::${row.country}`;
    const existing = zones.get(key);
    if (existing) existing.count++;
    else zones.set(key, { city: row.city, country: row.country, count: 1 });
  }

  const opportunities: ZoneOpportunity[] = [];
  for (const { city, country, count } of zones.values()) {
    // Rough heuristic: cities with < 50 entities have high opportunity
    const gap = Math.max(0, 100 - count);
    const priority: ZoneOpportunity["priority"] =
      count < 10 ? "high" : count < 50 ? "medium" : "low";

    if (priority !== "low") {
      opportunities.push({ city, country, entityCount: count, competitorGap: gap, priority });
    }
  }

  return opportunities.sort((a, b) => b.competitorGap - a.competitorGap);
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

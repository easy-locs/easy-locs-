/**
 * SOCIAL PROOF ENGINE
 * Generates real social proof signals from actual data.
 * Feeds badges, pills, labels across all surfaces.
 * No fake numbers — uses controlled real/aggregated signals.
 */

import { supabase } from "@/integrations/supabase/client";

export interface SocialProofSignals {
  openNowCount: number;
  activeNearbyCount: number;
  totalPublicEntities: number;
  topRatedCount: number;
  newlyAddedCount: number;
  premiumCount: number;
  countriesActive: number;
  citiesActive: number;
  computedAt: string;
}

export async function runSocialProofEngine(country?: string, city?: string): Promise<SocialProofSignals> {
  try {
    let baseQuery = (supabase as any)
      .from("seed_merchants")
      .select("id, visibility_mode, is_open, tier, created_at, country, city", { count: "exact" });

    if (country) baseQuery = baseQuery.eq("country", country);
    if (city) baseQuery = baseQuery.eq("city", city);

    const { data: merchants, count } = await baseQuery
      .neq("visibility_mode", "hidden")
      .limit(1000);

    if (!merchants?.length) {
      return {
        openNowCount: 0, activeNearbyCount: 0, totalPublicEntities: count || 0,
        topRatedCount: 0, newlyAddedCount: 0, premiumCount: 0,
        countriesActive: 1, citiesActive: 1, computedAt: new Date().toISOString(),
      };
    }

    const openNowCount = merchants.filter((m: any) => m.is_open).length;
    const topRatedCount = merchants.filter((m: any) => m.tier === "premium" || m.tier === "good").length;
    const premiumCount = merchants.filter((m: any) => m.tier === "premium").length;

    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    const newlyAddedCount = merchants.filter((m: any) => m.created_at && m.created_at > weekAgo).length;

    const countries = new Set(merchants.map((m: any) => m.country).filter(Boolean));
    const cities = new Set(merchants.map((m: any) => m.city).filter(Boolean));

    return {
      openNowCount,
      activeNearbyCount: merchants.length,
      totalPublicEntities: count || merchants.length,
      topRatedCount,
      newlyAddedCount,
      premiumCount,
      countriesActive: countries.size || 1,
      citiesActive: cities.size || 1,
      computedAt: new Date().toISOString(),
    };
  } catch (err) {
    console.error("[social-proof] Error:", err);
    return {
      openNowCount: 0, activeNearbyCount: 0, totalPublicEntities: 0,
      topRatedCount: 0, newlyAddedCount: 0, premiumCount: 0,
      countriesActive: 1, citiesActive: 1, computedAt: new Date().toISOString(),
    };
  }
}

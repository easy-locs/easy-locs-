/**
 * GEO DENSITY ENGINE
 * Detects vertical strength per area and adapts discovery priorities.
 * Influences homepage ordering, near you sections, radar emphasis, search suggestions.
 */

import { supabase } from "@/integrations/supabase/client";

export interface ZoneDensity {
  zone: string;
  city: string;
  country: string;
  verticalCounts: Record<string, number>;
  topVerticals: string[];
  topSubcategories: string[];
  totalEntities: number;
  densityScore: number;
  computedAt: string;
}

export interface GeoDensityReport {
  zones: ZoneDensity[];
  cityTotals: Record<string, number>;
  topCityVerticals: string[];
  computedAt: string;
}

export async function runGeoDensityEngine(country = "AE", city?: string): Promise<GeoDensityReport> {
  const zones: ZoneDensity[] = [];
  const cityTotals: Record<string, number> = {};

  try {
    let query = (supabase as any)
      .from("seed_merchants")
      .select("city, area, category, subcategory, visibility_mode")
      .eq("country", country)
      .neq("visibility_mode", "hidden")
      .limit(1000);

    if (city) query = query.eq("city", city);

    const { data: merchants } = await query;
    if (!merchants?.length) {
      return { zones: [], cityTotals: {}, topCityVerticals: [], computedAt: new Date().toISOString() };
    }

    const grouped: Record<string, typeof merchants> = {};
    for (const m of merchants) {
      const zone = m.area || m.city || "unknown";
      const cityKey = m.city || "unknown";
      if (!grouped[zone]) grouped[zone] = [];
      grouped[zone].push(m);
      cityTotals[cityKey] = (cityTotals[cityKey] || 0) + 1;
    }

    for (const [zone, items] of Object.entries(grouped)) {
      const verticalCounts: Record<string, number> = {};
      const subCounts: Record<string, number> = {};

      for (const item of items) {
        const v = item.category || "food";
        const s = item.subcategory || "general";
        verticalCounts[v] = (verticalCounts[v] || 0) + 1;
        subCounts[s] = (subCounts[s] || 0) + 1;
      }

      const topVerticals = Object.entries(verticalCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([v]) => v);

      const topSubcategories = Object.entries(subCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 8)
        .map(([s]) => s);

      const densityScore = Math.min(100, Math.round((items.length / 5) * 10));

      zones.push({
        zone,
        city: items[0]?.city || city || "Dubai",
        country,
        verticalCounts,
        topVerticals,
        topSubcategories,
        totalEntities: items.length,
        densityScore,
        computedAt: new Date().toISOString(),
      });
    }

    zones.sort((a, b) => b.densityScore - a.densityScore);

    const allVerticals: Record<string, number> = {};
    for (const z of zones) {
      for (const [v, c] of Object.entries(z.verticalCounts)) {
        allVerticals[v] = (allVerticals[v] || 0) + c;
      }
    }
    const topCityVerticals = Object.entries(allVerticals)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([v]) => v);

    return { zones, cityTotals, topCityVerticals, computedAt: new Date().toISOString() };
  } catch (err) {
    console.error("[geo-density] Error:", err);
    return { zones: [], cityTotals: {}, topCityVerticals: [], computedAt: new Date().toISOString() };
  }
}

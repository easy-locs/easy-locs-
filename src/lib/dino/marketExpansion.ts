/**
 * DINO V8 — Auto Market Expansion Engine
 * Detects underserved markets, gaps in supply, and expansion opportunities.
 */

export interface MarketZone {
  country: string;
  city: string;
  district?: string;
  population?: number;
  existingListings: number;
  activeCategories: string[];
  demandSignals: Record<string, number>; // category → demand 0-1
}

export interface ExpansionOpportunity {
  country: string;
  city: string;
  district?: string;
  category: string;
  gapScore: number;           // 0-100
  priority: "critical" | "high" | "medium" | "low";
  estimatedDemand: number;    // 0-1
  currentSupply: number;
  action: string;
}

export function detectExpansionOpportunities(zones: MarketZone[]): ExpansionOpportunity[] {
  const opportunities: ExpansionOpportunity[] = [];

  const ALL_CATEGORIES = ["restaurant", "grocery", "pharmacy", "delivery", "property", "travel", "services", "shopping"];

  for (const zone of zones) {
    for (const category of ALL_CATEGORIES) {
      const demand = zone.demandSignals[category] ?? 0;
      const hasCategory = zone.activeCategories.includes(category);
      const supplyCount = hasCategory ? Math.max(1, Math.floor(zone.existingListings * 0.15)) : 0;

      // Gap: demand exists but no/low supply
      if (demand > 0.3 && supplyCount < 3) {
        const gapScore = Math.round(demand * 100 - supplyCount * 10);
        opportunities.push({
          country: zone.country, city: zone.city, district: zone.district,
          category, gapScore: Math.min(100, Math.max(0, gapScore)),
          priority: gapScore > 70 ? "critical" : gapScore > 50 ? "high" : gapScore > 30 ? "medium" : "low",
          estimatedDemand: demand, currentSupply: supplyCount,
          action: supplyCount === 0
            ? `No ${category} in ${zone.city}${zone.district ? ` (${zone.district})` : ""} — initiate recruitment`
            : `Only ${supplyCount} ${category} providers — increase onboarding efforts`,
        });
      }
    }
  }

  return opportunities.sort((a, b) => b.gapScore - a.gapScore);
}

export function summarizeExpansionPlan(opportunities: ExpansionOpportunity[]) {
  const byCountry: Record<string, number> = {};
  const byCategory: Record<string, number> = {};
  for (const o of opportunities) {
    byCountry[o.country] = (byCountry[o.country] ?? 0) + 1;
    byCategory[o.category] = (byCategory[o.category] ?? 0) + 1;
  }
  return {
    total: opportunities.length,
    critical: opportunities.filter(o => o.priority === "critical").length,
    high: opportunities.filter(o => o.priority === "high").length,
    byCountry, byCategory,
  };
}

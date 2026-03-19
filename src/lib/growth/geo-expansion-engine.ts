/**
 * Geo Expansion Engine
 * Detects high-opportunity cities and auto-triggers expansion.
 */
import { supabase } from "@/integrations/supabase/client";
import { computeCityCoverage, type CoverageScore } from "@/lib/market/coverage-engine";

export interface ExpansionOpportunity {
  city: string;
  countryCode: string;
  opportunityScore: number;
  merchantDensity: number;
  activationReadiness: number;
  competitionProxy: number;
  recommendation: "boost_sourcing" | "boost_outreach" | "boost_demand" | "ready_to_launch" | "monitor";
}

export async function evaluateExpansionOpportunities(countryCode: string): Promise<ExpansionOpportunity[]> {
  // Get distinct cities with merchants
  const { data: cities } = await (supabase as any)
    .from("merchant_onboarding_profiles")
    .select("city")
    .eq("country_code", countryCode)
    .not("city", "is", null);

  const uniqueCities: string[] = [...new Set((cities ?? []).map((c: any) => c.city as string).filter(Boolean))];

  const opportunities: ExpansionOpportunity[] = [];

  for (const city of uniqueCities.slice(0, 20)) {
    const coverage = await computeCityCoverage(city, countryCode);

    const merchantDensity = Math.min(coverage.merchantCount * 2, 100);
    const activationReadiness = coverage.activeMerchantCount > 0
      ? (coverage.activeMerchantCount / Math.max(coverage.merchantCount, 1)) * 100
      : 0;

    const opportunityScore = Math.round(
      merchantDensity * 0.3 +
      coverage.coverageGapScore * 0.3 +
      coverage.acquisitionPriority * 0.2 +
      (100 - activationReadiness) * 0.2
    );

    let recommendation: ExpansionOpportunity["recommendation"] = "monitor";
    if (merchantDensity < 30) recommendation = "boost_sourcing";
    else if (activationReadiness < 20) recommendation = "boost_outreach";
    else if (coverage.coverageGapScore > 60) recommendation = "boost_demand";
    else if (activationReadiness > 50 && coverage.activeDriverCount > 0) recommendation = "ready_to_launch";

    opportunities.push({
      city,
      countryCode,
      opportunityScore,
      merchantDensity: Math.round(merchantDensity),
      activationReadiness: Math.round(activationReadiness),
      competitionProxy: 50, // placeholder
      recommendation,
    });
  }

  return opportunities.sort((a, b) => b.opportunityScore - a.opportunityScore);
}

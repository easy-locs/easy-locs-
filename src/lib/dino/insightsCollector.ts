/**
 * DINO V9 — Platform Insights Collector
 * Gathers real data from Supabase to feed the decision engine.
 */

import { supabase } from "@/integrations/supabase/client";
import type { PlatformInsights } from "./decisionEngine";

export async function collectPlatformInsights(): Promise<PlatformInsights> {
  const insights: PlatformInsights = {
    riskLevel: "low",
    predictedIssues: [],
    marketGap: [],
    inactivePros: [],
    lowConversionFlows: [],
    newOpportunities: [],
    saturatedCategories: [],
  };

  // 1) Open critical issues → risk level
  const { count: criticalCount } = await supabase
    .from("dino_issues")
    .select("id", { count: "exact", head: true })
    .eq("status", "open")
    .eq("severity", "critical");

  if ((criticalCount ?? 0) > 5) insights.riskLevel = "critical";
  else if ((criticalCount ?? 0) > 2) insights.riskLevel = "high";
  else if ((criticalCount ?? 0) > 0) insights.riskLevel = "medium";

  // 2) Open issues with labels for UI fix
  const { data: openIssues } = await supabase
    .from("dino_issues")
    .select("route, details_json")
    .eq("status", "open")
    .eq("issue_type", "category")
    .limit(20);

  if (openIssues) {
    insights.predictedIssues = openIssues.map(i => ({
      route: i.route,
      labels: Array.isArray((i.details_json as any)?.labels) ? (i.details_json as any).labels : [],
    }));
  }

  // 3) Market balance → gaps
  const { data: balanceData } = await supabase
    .from("dino_market_balance")
    .select("category, city, supply_count, demand_score")
    .order("demand_score", { ascending: false })
    .limit(20);

  if (balanceData) {
    for (const row of balanceData) {
      if ((row.supply_count ?? 0) < 3 && (row.demand_score ?? 0) > 50) {
        insights.marketGap.push({ category: row.category, city: row.city });
      }
      if ((row.supply_count ?? 0) > 30 && (row.demand_score ?? 0) < 20) {
        insights.saturatedCategories.push({
          category: row.category,
          city: row.city,
          entityIds: [], // would need sub-query in production
        });
      }
    }
  }

  // 4) Low-performing pros
  const { data: proPerfData } = await supabase
    .from("dino_pro_performance")
    .select("pro_id")
    .lt("overall_score", 30)
    .limit(50);

  if (proPerfData) {
    insights.inactivePros = proPerfData.map(p => p.pro_id);
  }

  // 5) Conversion funnels with high drop
  const { data: funnelData } = await supabase
    .from("dino_conversion_funnels")
    .select("funnel_name, drop_rate")
    .gt("drop_rate", 0.5)
    .limit(10);

  if (funnelData) {
    insights.lowConversionFlows = funnelData.map(f => ({
      flowId: f.funnel_name,
      dropRate: f.drop_rate ?? 0,
      suggestion: (f.drop_rate ?? 0) > 0.7 ? "Simplify flow" : "Improve CTA",
    }));
  }

  // 6) Expansion opportunities
  const { data: expansionData } = await supabase
    .from("dino_expansion_opportunities")
    .select("city, category, opportunity_type")
    .eq("status", "identified")
    .limit(10);

  if (expansionData) {
    insights.newOpportunities = expansionData.map(e => ({
      name: `${e.category} in ${e.city}`,
      category: e.category,
      city: e.city,
    }));
  }

  return insights;
}

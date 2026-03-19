/**
 * DINO V9 — Decision Engine
 * Converts platform insights into prioritized autonomous actions.
 */

import type { DinoAction, DinoActionPriority } from "./actionEngine";

export interface PlatformInsights {
  riskLevel: "critical" | "high" | "medium" | "low";
  predictedIssues: Array<{ route: string; labels?: string[] }>;
  marketGap: Array<{ category: string; city: string }>;
  inactivePros: string[];
  lowConversionFlows: Array<{ flowId: string; dropRate: number; suggestion?: string }>;
  newOpportunities: Array<{ name: string; category: string; city: string }>;
  saturatedCategories: Array<{ category: string; city: string; entityIds: string[] }>;
}

function uid(): string {
  return crypto.randomUUID();
}

export function generateActionsFromInsights(insights: PlatformInsights): DinoAction[] {
  const actions: DinoAction[] = [];

  // 1) Critical UI fixes
  if (insights.riskLevel === "critical" && insights.predictedIssues.length > 0) {
    const allLabels = insights.predictedIssues.flatMap(i => i.labels ?? []);
    if (allLabels.length > 0) {
      actions.push({
        id: uid(),
        type: "fix_ui",
        priority: "critical",
        autoExecute: true,
        payload: { labels: allLabels },
      });
    }
  }

  // 2) Market gap → boost underserved categories
  for (const gap of insights.marketGap.slice(0, 5)) {
    actions.push({
      id: uid(),
      type: "boost_category",
      priority: "high",
      autoExecute: true,
      payload: { categories: [gap.category], city: gap.city },
    });
  }

  // 3) Inactive pros → activation
  if (insights.inactivePros.length > 0) {
    actions.push({
      id: uid(),
      type: "activate_pro",
      priority: insights.inactivePros.length > 20 ? "critical" : "high",
      autoExecute: true,
      payload: { proIds: insights.inactivePros },
    });
  }

  // 4) Low conversion flows → optimize
  for (const flow of insights.lowConversionFlows.slice(0, 3)) {
    actions.push({
      id: uid(),
      type: "optimize_flow",
      priority: flow.dropRate > 0.7 ? "critical" : "high",
      autoExecute: true,
      payload: { flowId: flow.flowId, suggestion: flow.suggestion },
    });
  }

  // 5) New opportunities → draft listings
  for (const opp of insights.newOpportunities.slice(0, 10)) {
    actions.push({
      id: uid(),
      type: "create_listing",
      priority: "medium",
      autoExecute: true,
      payload: { name: opp.name, category: opp.category, city: opp.city },
    });
  }

  // 6) Saturated categories → reduce visibility
  for (const sat of insights.saturatedCategories.slice(0, 3)) {
    actions.push({
      id: uid(),
      type: "reduce_visibility",
      priority: "medium",
      autoExecute: true,
      payload: { entityIds: sat.entityIds.slice(0, 10), category: sat.category, city: sat.city },
    });
  }

  // Sort by priority
  const priorityOrder: Record<DinoActionPriority, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  actions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return actions;
}

/**
 * DINO V7 — Predictive UX Engine
 * Anticipates UX problems before they happen using historical patterns.
 */

export interface PredictionInput {
  route: string;
  historicalDropRate: number;       // 0-1
  avgTimeOnPage: number;            // seconds
  bounceRate: number;               // 0-1
  rageClickRate: number;            // per session
  previousIssueCount: number;
  qualityScore: number;             // 0-100
  lastAuditDaysAgo: number;
  contentChangeFrequency: number;   // changes per week
}

export interface UxPrediction {
  route: string;
  riskLevel: "critical" | "high" | "medium" | "low";
  riskScore: number;                // 0-100
  predictedIssues: PredictedIssue[];
  recommendedActions: string[];
}

export interface PredictedIssue {
  type: string;
  probability: number;             // 0-1
  description: string;
  preventiveAction: string;
}

export function predictUxIssues(inputs: PredictionInput[]): UxPrediction[] {
  return inputs.map(input => {
    const issues: PredictedIssue[] = [];

    // High drop rate predicts confusion
    if (input.historicalDropRate > 0.4) {
      issues.push({
        type: "user_confusion",
        probability: Math.min(1, input.historicalDropRate * 1.2),
        description: `${Math.round(input.historicalDropRate * 100)}% drop rate — users likely confused`,
        preventiveAction: "Simplify page layout and highlight primary CTA",
      });
    }

    // Low time on page + high bounce = irrelevant content
    if (input.avgTimeOnPage < 5 && input.bounceRate > 0.6) {
      issues.push({
        type: "content_mismatch",
        probability: 0.8,
        description: "Users leaving quickly — content may not match expectations",
        preventiveAction: "Review page title/description alignment with actual content",
      });
    }

    // Rage clicks predict interaction issues
    if (input.rageClickRate > 2) {
      issues.push({
        type: "interaction_failure",
        probability: Math.min(1, input.rageClickRate / 5),
        description: `${input.rageClickRate.toFixed(1)} rage clicks/session — UI elements likely broken or unresponsive`,
        preventiveAction: "Increase tap targets, add loading states, verify click handlers",
      });
    }

    // Stale audit = unknown state
    if (input.lastAuditDaysAgo > 7 && input.contentChangeFrequency > 2) {
      issues.push({
        type: "stale_audit",
        probability: 0.6,
        description: "Frequent content changes without recent audit — regressions likely",
        preventiveAction: "Schedule immediate re-audit of this route",
      });
    }

    // Low quality score degradation
    if (input.qualityScore < 60 && input.previousIssueCount > 3) {
      issues.push({
        type: "quality_degradation",
        probability: 0.75,
        description: `Quality score ${input.qualityScore}/100 with ${input.previousIssueCount} unresolved issues`,
        preventiveAction: "Prioritize issue resolution — quality trending down",
      });
    }

    const riskScore = Math.min(100, Math.round(
      issues.reduce((sum, i) => sum + i.probability * 25, 0) +
      (100 - input.qualityScore) * 0.3 +
      input.historicalDropRate * 20
    ));

    const riskLevel = riskScore > 75 ? "critical" : riskScore > 50 ? "high" : riskScore > 25 ? "medium" : "low";

    const recommendedActions = issues
      .sort((a, b) => b.probability - a.probability)
      .slice(0, 3)
      .map(i => i.preventiveAction);

    return { route: input.route, riskLevel, riskScore, predictedIssues: issues, recommendedActions };
  });
}

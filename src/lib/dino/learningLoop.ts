/**
 * DINO V5 — Continuous Learning Loop
 * Tracks fix outcomes, adjusts scoring weights, and evolves rules over time.
 */

export interface LearningEvent {
  type: "fix_applied" | "fix_reverted" | "score_improved" | "score_degraded" | "user_behavior" | "pro_behavior";
  entityType: string;
  entityId: string;
  metric: string;
  previousValue: number;
  newValue: number;
  timestamp: number;
}

export interface LearningInsight {
  rule: string;
  confidence: number;
  sampleSize: number;
  recommendation: string;
}

const LEARNING_EVENTS: LearningEvent[] = [];
const MAX_EVENTS = 500;

export function recordLearningEvent(event: LearningEvent) {
  LEARNING_EVENTS.push(event);
  if (LEARNING_EVENTS.length > MAX_EVENTS) LEARNING_EVENTS.shift();
}

export function analyzeLearningTrends(): LearningInsight[] {
  const insights: LearningInsight[] = [];

  // Analyze fix success rate
  const fixes = LEARNING_EVENTS.filter(e => e.type === "fix_applied");
  const reverts = LEARNING_EVENTS.filter(e => e.type === "fix_reverted");
  if (fixes.length > 0) {
    const successRate = 1 - (reverts.length / fixes.length);
    insights.push({
      rule: "auto_fix_success_rate",
      confidence: Math.min(1, fixes.length / 20),
      sampleSize: fixes.length,
      recommendation: successRate > 0.9
        ? "Auto-fix system performing well. Consider expanding safe-fix scope."
        : successRate > 0.7
        ? "Auto-fix acceptable. Review reverted fixes for pattern improvements."
        : "Auto-fix unreliable. Tighten safe-fix criteria.",
    });
  }

  // Analyze score trends
  const scoreChanges = LEARNING_EVENTS.filter(e => e.type === "score_improved" || e.type === "score_degraded");
  const improvements = scoreChanges.filter(e => e.type === "score_improved").length;
  const degradations = scoreChanges.filter(e => e.type === "score_degraded").length;
  if (scoreChanges.length > 0) {
    insights.push({
      rule: "quality_trend",
      confidence: Math.min(1, scoreChanges.length / 30),
      sampleSize: scoreChanges.length,
      recommendation: improvements > degradations
        ? `Quality improving: ${improvements} improvements vs ${degradations} degradations.`
        : `Quality declining: ${degradations} degradations vs ${improvements} improvements. Investigate root causes.`,
    });
  }

  // Analyze user behavior patterns
  const userEvents = LEARNING_EVENTS.filter(e => e.type === "user_behavior");
  if (userEvents.length >= 10) {
    const avgDelta = userEvents.reduce((sum, e) => sum + (e.newValue - e.previousValue), 0) / userEvents.length;
    insights.push({
      rule: "user_engagement_trend",
      confidence: Math.min(1, userEvents.length / 50),
      sampleSize: userEvents.length,
      recommendation: avgDelta > 0
        ? "User engagement improving. Current UX optimizations are effective."
        : "User engagement declining. Prioritize UX adaptation rules.",
    });
  }

  return insights;
}

export function getLearningStats() {
  const byType: Record<string, number> = {};
  for (const e of LEARNING_EVENTS) {
    byType[e.type] = (byType[e.type] ?? 0) + 1;
  }
  return { total: LEARNING_EVENTS.length, byType };
}

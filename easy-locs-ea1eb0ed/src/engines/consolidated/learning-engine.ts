import { BaseEngine, type EngineTickResult } from "../core/base-engine";
import { reportHealth } from "@/lib/runtime/health-aggregator";
import {
  trackPageView as _trackPageView,
  trackConversion as _trackConversion,
  getAnalyticsSnapshot,
} from "../analytics/analytics-engine";
import {
  scoreRecommendations,
  getRecommendations as _getRecommendations,
  type RecommendationItem,
} from "../recommendations/recommendation-engine";

export { trackPageView, trackConversion, getAnalyticsSnapshot } from "../analytics/analytics-engine";
export { scoreRecommendations, getRecommendations, type RecommendationItem } from "../recommendations/recommendation-engine";

function getTimeOfDay(): "morning" | "afternoon" | "evening" | "night" {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 22) return "evening";
  return "night";
}

export class LearningEngine extends BaseEngine {
  constructor() {
    super({
      id: "learning-engine",
      name: "Learning Engine",
      category: "learning",
      domain: "analytics",
      intervalMs: 60_000,
    });
  }

  async tick(): Promise<EngineTickResult> {
    const actions: string[] = [];
    let totalFindings = 0;

    const snapshot = getAnalyticsSnapshot();
    reportHealth("learning-engine", "ok", 10);
    this.emit("analytics-snapshot", {
      totalPageViews: snapshot.totalPageViews,
      totalSessions: snapshot.totalSessions,
    });

    const ctx = { timeOfDay: getTimeOfDay() };
    const recommendations = scoreRecommendations(ctx);
    totalFindings += recommendations.length;
    actions.push(`Scored ${recommendations.length} recommendations`);

    this.emit("recommendations-updated", {
      count: recommendations.length,
      topScore: recommendations[0]?.score ?? 0,
      timeOfDay: ctx.timeOfDay,
    });

    await this.tickSentinelScoring(actions);
    await this.tickAuditTrail(actions);

    return {
      level: "observe",
      findings: totalFindings,
      actions,
      duration: 0,
    };
  }

  private async tickSentinelScoring(actions: string[]): Promise<void> {
    try {
      const { sentinelScoringEngine } = await import("@/core/sentinel/scoring/sentinel-scoring-engine");
      const scores = sentinelScoringEngine.calculate();
      actions.push(`Sentinel score: ${scores.global_score} (health=${scores.health_score}, conflict=${scores.conflict_score})`);
      if (scores.global_score < 40) {
        actions.push(`CRITICAL: Sentinel global score below 40`);
      }
      this.emit("sentinel-scores", scores);
    } catch (err) { if (import.meta.env.DEV) console.warn('[learning] sub-module error', err instanceof Error ? err.message : err); }
  }

  private async tickAuditTrail(actions: string[]): Promise<void> {
    try {
      const { getAuditTrailStats } = await import("@/lib/data-quality/engines/audit-trail-engine");
      const stats = getAuditTrailStats();
      if (stats.total > 0) {
        actions.push(`Audit trail: ${stats.total} entries across ${Object.keys(stats.byEngine).length} modules`);
      }
    } catch (err) { if (import.meta.env.DEV) console.warn('[learning] sub-module error', err instanceof Error ? err.message : err); }
  }
}

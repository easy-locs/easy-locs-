import { BaseEngine, type EngineTickResult } from "../core/base-engine";
import { engineObserver } from "../core/engine-observer";

interface AnalysisReport {
  timestamp: number;
  healthScore: number;
  topIssues: string[];
  recommendations: string[];
}

export class AIAnalysisEngine extends BaseEngine {
  private reports: AnalysisReport[] = [];

  constructor() {
    super({
      id: "ai-analysis",
      name: "AI Analysis Engine",
      category: "ai",
      intervalMs: 300_000,
    });
  }

  async tick(): Promise<EngineTickResult> {
    const findings: string[] = [];
    const report = engineObserver.getReport();

    let healthScore = 100;
    const topIssues: string[] = [];
    const recommendations: string[] = [];

    if (report.totalErrors > 0) {
      const errorPenalty = Math.min(30, report.totalErrors * 2);
      healthScore -= errorPenalty;
      topIssues.push(`${report.totalErrors} engine errors detected`);
    }

    const highFindingEngines = report.engines.filter(e => e.totalFindings > 20);
    if (highFindingEngines.length > 0) {
      healthScore -= highFindingEngines.length * 3;
      for (const e of highFindingEngines) {
        topIssues.push(`${e.engineId}: ${e.totalFindings} findings`);
      }
      recommendations.push("Investigate high-finding engines for systemic issues");
    }

    const slowEngines = report.engines.filter(e => e.avgDurationMs > 100);
    if (slowEngines.length > 0) {
      healthScore -= slowEngines.length * 2;
      recommendations.push(`${slowEngines.length} engines running slow (>100ms avg)`);
    }

    healthScore = Math.max(0, Math.min(100, healthScore));

    this.reports.push({ timestamp: Date.now(), healthScore, topIssues, recommendations });
    if (this.reports.length > 50) this.reports = this.reports.slice(-50);

    if (healthScore < 70) {
      findings.push(`Platform health score: ${healthScore}/100`);
    }

    return { level: findings.length > 0 ? "propose" : "observe", findings: findings.length, actions: [], duration: 0 };
  }

  getLatestReport(): AnalysisReport | null {
    return this.reports[this.reports.length - 1] || null;
  }

  getHealthTrend(): Array<{ ts: number; score: number }> {
    return this.reports.map(r => ({ ts: r.timestamp, score: r.healthScore }));
  }
}

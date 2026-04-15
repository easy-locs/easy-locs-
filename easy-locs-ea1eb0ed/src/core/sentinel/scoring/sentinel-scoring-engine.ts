import type { SentinelScores } from "../types";
import { sentinelEngineRegistry } from "../registry/module-tracker";
import { sentinelConflictEngine } from "../conflict/sentinel-conflict-engine";
import { sentinelHealthEngine } from "../health/sentinel-health-engine";
import { sentinelInvariantEngine } from "../invariants/invariant-engine";
import { sentinelAuditEngine } from "../audit/sentinel-audit-engine";
import { sentinelQualityGate } from "../quality-gates/sentinel-quality-gate";
import { sentinelIncidentEngine } from "../incidents/sentinel-incident-engine";

const WEIGHTS = {
  health: 0.20,
  conflict: 0.20,
  audit: 0.15,
  invariant: 0.15,
  incidents: 0.10,
  engines: 0.10,
  quality_gate: 0.10,
};

class SentinelScoringEngine {
  private _lastScores: SentinelScores | null = null;

  calculate(): SentinelScores {
    const healthStats = sentinelHealthEngine.getStats();
    const healthScore = healthStats.global_status === "healthy" ? 100 : healthStats.global_status === "degraded" ? 60 : 20;

    const conflictScore = sentinelConflictEngine.getScore();

    const auditStats = sentinelAuditEngine.getStats();
    const auditScore = auditStats.avg_score;

    const invariantResults = sentinelInvariantEngine.getLastResults();
    const invariantScore = invariantResults.length > 0
      ? Math.round((invariantResults.filter((r) => r.passed).length / invariantResults.length) * 100)
      : 100;

    const incidentStats = sentinelIncidentEngine.getStats();
    const incidentPenalty = incidentStats.critical * 20 + incidentStats.open * 5;
    const stabilityScore = Math.max(0, 100 - incidentPenalty);

    const engineSummary = sentinelEngineRegistry.getSummary();
    const engineScore = engineSummary.total > 0
      ? Math.round((engineSummary.healthy / engineSummary.total) * 100)
      : 100;

    const lastGate = sentinelQualityGate.getLastResult();
    const gateScore = lastGate ? lastGate.score : 100;

    const globalScore = Math.round(
      healthScore * WEIGHTS.health +
      conflictScore * WEIGHTS.conflict +
      auditScore * WEIGHTS.audit +
      invariantScore * WEIGHTS.invariant +
      stabilityScore * WEIGHTS.incidents +
      engineScore * WEIGHTS.engines +
      gateScore * WEIGHTS.quality_gate
    );

    const releaseReadiness = Math.min(
      healthScore >= 60 ? 100 : 0,
      conflictScore >= 50 ? 100 : 0,
      invariantScore >= 80 ? 100 : 0,
      globalScore
    );

    this._lastScores = {
      health_score: healthScore,
      conflict_score: conflictScore,
      audit_score: auditScore,
      stability_score: stabilityScore,
      release_readiness: releaseReadiness,
      global_score: globalScore,
    };

    return this._lastScores;
  }

  getLastScores(): SentinelScores {
    return this._lastScores || this.calculate();
  }

  isHealthy(): boolean {
    const scores = this.getLastScores();
    return scores.global_score >= 70;
  }

  isDegraded(): boolean {
    const scores = this.getLastScores();
    return scores.global_score >= 40 && scores.global_score < 70;
  }

  isCritical(): boolean {
    const scores = this.getLastScores();
    return scores.global_score < 40;
  }
}

export const sentinelScoringEngine = new SentinelScoringEngine();

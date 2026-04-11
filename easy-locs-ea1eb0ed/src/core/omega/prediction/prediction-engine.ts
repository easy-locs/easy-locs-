import type { PredictionRecord, OmegaPredictionType, OmegaEngineStatus } from "../omega-types";

const MAX_PREDICTIONS = 1_000;
let predIdCounter = 0;

class PredictionEngine {
  readonly name = "omega-prediction";
  readonly domain = "omega";
  status: OmegaEngineStatus = "idle";
  lastRunAt = 0;

  private predictions = new Map<string, PredictionRecord>();
  private historicalAccuracy: Array<{ type: OmegaPredictionType; correct: boolean }> = [];

  getStatus(): OmegaEngineStatus { return this.status; }
  getHeartbeat() { return { alive: this.status !== "stopped", lastBeat: this.lastRunAt }; }

  predict(
    type: OmegaPredictionType,
    targetType: string,
    targetId: string,
    riskScore: number,
    confidenceScore: number,
    predictedForMs: number,
    preventiveAction: string,
    preEmptiveAudit = false,
    rolloutRestriction = false,
  ): PredictionRecord {
    if (this.predictions.size >= MAX_PREDICTIONS) {
      const oldest = [...this.predictions.entries()].sort((a, b) => a[1].predicted_at - b[1].predicted_at)[0];
      if (oldest) this.predictions.delete(oldest[0]);
    }
    const pred: PredictionRecord = {
      prediction_id: `pred_${++predIdCounter}`,
      prediction_type: type,
      target_type: targetType,
      target_id: targetId,
      risk_score: Math.min(Math.max(riskScore, 0), 100),
      confidence_score: Math.min(Math.max(confidenceScore, 0), 1),
      predicted_at: Date.now(),
      predicted_for: predictedForMs,
      preventive_action: preventiveAction,
      pre_emptive_audit: preEmptiveAudit,
      rollout_restriction: rolloutRestriction,
      outcome: "pending",
    };
    this.predictions.set(pred.prediction_id, pred);
    this.lastRunAt = Date.now();
    return pred;
  }

  resolvePrediction(predictionId: string, outcome: "confirmed" | "false_alarm"): boolean {
    const pred = this.predictions.get(predictionId);
    if (!pred) return false;
    pred.outcome = outcome;
    this.historicalAccuracy.push({ type: pred.prediction_type, correct: outcome === "confirmed" });
    if (this.historicalAccuracy.length > 5_000) {
      this.historicalAccuracy = this.historicalAccuracy.slice(-5_000);
    }
    return true;
  }

  getActivePredictions(): PredictionRecord[] {
    return [...this.predictions.values()]
      .filter((p) => p.outcome === "pending")
      .sort((a, b) => b.risk_score - a.risk_score);
  }

  getByType(type: OmegaPredictionType): PredictionRecord[] {
    return [...this.predictions.values()]
      .filter((p) => p.prediction_type === type)
      .sort((a, b) => b.risk_score - a.risk_score);
  }

  getHighRisk(threshold = 70): PredictionRecord[] {
    return this.getActivePredictions().filter((p) => p.risk_score >= threshold);
  }

  getAccuracy(type?: OmegaPredictionType): { precision: number; recall: number; total: number; confirmed: number; false_alarms: number } {
    const relevant = type ? this.historicalAccuracy.filter((h) => h.type === type) : this.historicalAccuracy;
    const confirmed = relevant.filter((h) => h.correct).length;
    const falseAlarms = relevant.filter((h) => !h.correct).length;
    const total = relevant.length;
    return {
      precision: total > 0 ? confirmed / total : 0,
      recall: confirmed > 0 ? 1 : 0,
      total,
      confirmed,
      false_alarms: falseAlarms,
    };
  }

  predictEngineFailure(engineId: string, errorRate: number, staleness: number): PredictionRecord | null {
    const risk = Math.min((errorRate * 40) + (staleness * 30), 100);
    if (risk < 20) return null;
    return this.predict("engine_failure", "engine", engineId, risk, Math.min(errorRate / 10, 1), Date.now() + 3_600_000, "isolate_engine_and_recheck", true);
  }

  predictWorkflowTimeout(workflowId: string, avgDuration: number, timeoutMs: number): PredictionRecord | null {
    const ratio = avgDuration / timeoutMs;
    if (ratio < 0.7) return null;
    const risk = Math.min(ratio * 100, 100);
    return this.predict("workflow_timeout", "workflow", workflowId, risk, Math.min(ratio, 1), Date.now() + 1_800_000, "increase_timeout_or_optimize", false, ratio > 0.9);
  }

  predictDemandSpike(geoZone: string, currentDemand: number, historicalAvg: number): PredictionRecord | null {
    const ratio = historicalAvg > 0 ? currentDemand / historicalAvg : 0;
    if (ratio < 1.5) return null;
    const risk = Math.min((ratio - 1) * 50, 100);
    return this.predict("demand_spike", "geo_zone", geoZone, risk, Math.min(ratio / 3, 1), Date.now() + 7_200_000, "prepare_supply_scaling");
  }

  getStats() {
    const typeCounts: Record<string, number> = {};
    let pending = 0;
    for (const [, p] of this.predictions) {
      typeCounts[p.prediction_type] = (typeCounts[p.prediction_type] || 0) + 1;
      if (p.outcome === "pending") pending++;
    }
    const accuracy = this.getAccuracy();
    return {
      total_predictions: this.predictions.size,
      pending,
      by_type: typeCounts,
      overall_precision: accuracy.precision,
      historical_total: this.historicalAccuracy.length,
    };
  }

  boot(): void {
    this.status = "active";
    this.lastRunAt = Date.now();
    console.log(`[OMEGA] PredictionEngine booted | predictions: ${this.predictions.size}`);
  }

  shutdown(): void { this.status = "stopped"; }
}

export const predictionEngine = new PredictionEngine();

/**
 * SLO / SLI definitions per critical domain.
 *
 * An SLI (Service Level Indicator) is the measured metric (e.g. p95 latency,
 * error rate). An SLO (Service Level Objective) is the target we commit to.
 * Error budget = (1 - objective) × total events over the window.
 */

import { snapshotByDomain } from "./red-metrics";

export type SloKind = "availability" | "latency_p95" | "latency_p99" | "quality";

export interface SloDefinition {
  id: string;
  domain: string;
  kind: SloKind;
  objective: number;
  windowDays: number;
  description: string;
  threshold_ms?: number;
  critical: boolean;
}

export const SLO_CATALOG: SloDefinition[] = [
  {
    id: "ride.availability",
    domain: "rider",
    kind: "availability",
    objective: 0.995,
    windowDays: 30,
    description: "Ride bookings succeed ≥ 99.5% of the time",
    critical: true,
  },
  {
    id: "ride.eta_accuracy",
    domain: "rider",
    kind: "quality",
    objective: 0.9,
    windowDays: 7,
    description: "Ride ETA within ±20% of actual ≥ 90%",
    critical: true,
  },
  {
    id: "maps.init_success",
    domain: "maps",
    kind: "availability",
    objective: 0.99,
    windowDays: 7,
    description: "Map initialization succeeds ≥ 99%",
    critical: true,
  },
  {
    id: "maps.tile_latency_p95",
    domain: "maps",
    kind: "latency_p95",
    objective: 0.95,
    threshold_ms: 1500,
    windowDays: 7,
    description: "95% of map tile loads under 1.5s",
    critical: false,
  },
  {
    id: "payments.success_rate",
    domain: "payment",
    kind: "availability",
    objective: 0.995,
    windowDays: 30,
    description: "Payment captures succeed ≥ 99.5%",
    critical: true,
  },
  {
    id: "payments.latency_p95",
    domain: "payment",
    kind: "latency_p95",
    objective: 0.95,
    threshold_ms: 3000,
    windowDays: 7,
    description: "95% of payment confirmations under 3s",
    critical: true,
  },
  {
    id: "orbit.message_delivery",
    domain: "orbit",
    kind: "availability",
    objective: 0.999,
    windowDays: 7,
    description: "Orbit message delivery ≥ 99.9%",
    critical: true,
  },
  {
    id: "orbit.realtime_latency_p95",
    domain: "orbit",
    kind: "latency_p95",
    objective: 0.95,
    threshold_ms: 500,
    windowDays: 7,
    description: "95% of Orbit Realtime deliveries under 500ms",
    critical: true,
  },
  {
    id: "identity.auth_success",
    domain: "identity",
    kind: "availability",
    objective: 0.999,
    windowDays: 30,
    description: "Identity auth success ≥ 99.9%",
    critical: true,
  },
  {
    id: "wallet.transfer_success",
    domain: "wallet",
    kind: "availability",
    objective: 0.999,
    windowDays: 30,
    description: "Wallet transfers succeed ≥ 99.9%",
    critical: true,
  },
  {
    id: "ai.latency_p95",
    domain: "intelligence",
    kind: "latency_p95",
    objective: 0.95,
    threshold_ms: 8000,
    windowDays: 7,
    description: "95% of AI completions under 8s",
    critical: false,
  },
];

export interface SloEvaluation {
  slo: SloDefinition;
  sli_value: number;
  meets_objective: boolean;
  error_budget_remaining: number;
  error_budget_burn: number;
  sample_count: number;
}

function thresholdRatio(threshold: number | undefined, actual: number): number {
  if (!threshold) return 0;
  if (actual <= threshold) return 1;
  return Math.max(0, 1 - (actual - threshold) / threshold);
}

export function evaluateSlo(slo: SloDefinition, windowMs?: number): SloEvaluation {
  const windowFromDays = slo.windowDays * 24 * 60 * 60 * 1000;
  const window = Math.min(windowMs ?? windowFromDays, windowFromDays);
  const stats = snapshotByDomain(window)[slo.domain];

  if (!stats || stats.count === 0) {
    return {
      slo,
      sli_value: slo.objective,
      meets_objective: true,
      error_budget_remaining: 1,
      error_budget_burn: 0,
      sample_count: 0,
    };
  }

  let sli = slo.objective;
  let meets = true;
  switch (slo.kind) {
    case "availability":
    case "quality":
      sli = 1 - stats.error_rate;
      meets = sli >= slo.objective;
      break;
    case "latency_p95":
      sli = thresholdRatio(slo.threshold_ms, stats.p95);
      meets = stats.p95 <= (slo.threshold_ms ?? Infinity);
      break;
    case "latency_p99":
      sli = thresholdRatio(slo.threshold_ms, stats.p99);
      meets = stats.p99 <= (slo.threshold_ms ?? Infinity);
      break;
  }

  const allowedErrorRate = 1 - slo.objective;
  const actualErrorRate = Math.max(0, 1 - sli);
  const burn = allowedErrorRate > 0 ? actualErrorRate / allowedErrorRate : 0;
  const remaining = Math.max(0, 1 - burn);

  return {
    slo,
    sli_value: sli,
    meets_objective: meets,
    error_budget_remaining: remaining,
    error_budget_burn: burn,
    sample_count: stats.count,
  };
}

export function evaluateAllSlos(): SloEvaluation[] {
  return SLO_CATALOG.map((s) => evaluateSlo(s));
}

export function criticalSloBreaches(): SloEvaluation[] {
  return evaluateAllSlos().filter((e) => e.slo.critical && !e.meets_objective);
}

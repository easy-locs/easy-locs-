/**
 * Dynamic Surge Pricing — Transparent & auditable.
 *
 * Computes surge multipliers from live demand/supply signals with bounded
 * output and an audit trail so customers and ops can inspect *why* a given
 * multiplier was applied.
 */

export interface SurgeInputs {
  /** Open (unmatched) ride requests in the zone at decision time. */
  openRequests: number;
  /** Available, idle drivers in the zone. */
  availableDrivers: number;
  /** Recent acceptance rate (0-1). Low acceptance = more surge. */
  recentAcceptanceRate?: number;
  /** Average wait time in seconds for recent rides. */
  avgWaitSeconds?: number;
  /** Optional weather factor >= 1 (e.g. heavy rain 1.15). */
  weatherFactor?: number;
  /** Optional event factor >= 1 (stadium egress, holiday). */
  eventFactor?: number;
  /** Hour of day (0-23). Local time. Used for rush-hour baseline. */
  hourOfDay?: number;
}

export interface SurgeAuditReason {
  label: string;
  delta: number;
  detail?: string;
}

export interface SurgeDecision {
  multiplier: number;
  tier: "none" | "low" | "moderate" | "high" | "extreme";
  audit: {
    inputs: SurgeInputs;
    reasons: SurgeAuditReason[];
    computedAt: string;
    version: string;
  };
}

export const SURGE_CONFIG = {
  min: 1.0,
  max: 3.0,
  rushHours: new Set([7, 8, 9, 17, 18, 19]),
  version: "surge-v1.2",
} as const;

function demandRatio(open: number, available: number): number {
  if (available <= 0) return open > 0 ? 4 : 1;
  return open / available;
}

function tierFor(multiplier: number): SurgeDecision["tier"] {
  if (multiplier <= 1.05) return "none";
  if (multiplier <= 1.25) return "low";
  if (multiplier <= 1.6) return "moderate";
  if (multiplier <= 2.2) return "high";
  return "extreme";
}

export function computeSurge(inputs: SurgeInputs): SurgeDecision {
  const reasons: SurgeAuditReason[] = [];
  let mult = 1.0;

  const ratio = demandRatio(inputs.openRequests, inputs.availableDrivers);
  if (ratio >= 3) {
    const add = Math.min(1.5, (ratio - 2) * 0.35);
    mult += add;
    reasons.push({
      label: "demand_exceeds_supply",
      delta: add,
      detail: `open=${inputs.openRequests} vs drivers=${inputs.availableDrivers} (ratio ${ratio.toFixed(2)})`,
    });
  } else if (ratio >= 1.5) {
    const add = (ratio - 1) * 0.2;
    mult += add;
    reasons.push({
      label: "demand_above_supply",
      delta: add,
      detail: `ratio ${ratio.toFixed(2)}`,
    });
  }

  if (inputs.recentAcceptanceRate !== undefined && inputs.recentAcceptanceRate < 0.5) {
    const add = Math.min(0.35, (0.5 - inputs.recentAcceptanceRate) * 1.2);
    mult += add;
    reasons.push({
      label: "low_acceptance_rate",
      delta: add,
      detail: `${Math.round(inputs.recentAcceptanceRate * 100)}%`,
    });
  }

  if (inputs.avgWaitSeconds !== undefined && inputs.avgWaitSeconds > 240) {
    const add = Math.min(0.3, (inputs.avgWaitSeconds - 240) / 1200);
    mult += add;
    reasons.push({
      label: "long_wait_times",
      delta: add,
      detail: `${Math.round(inputs.avgWaitSeconds)}s`,
    });
  }

  if (inputs.hourOfDay !== undefined && SURGE_CONFIG.rushHours.has(inputs.hourOfDay)) {
    const add = 0.1;
    mult += add;
    reasons.push({ label: "rush_hour_baseline", delta: add, detail: `hour ${inputs.hourOfDay}` });
  }

  if (inputs.weatherFactor && inputs.weatherFactor > 1) {
    const add = Math.min(0.3, inputs.weatherFactor - 1);
    mult += add;
    reasons.push({ label: "weather", delta: add, detail: `factor ${inputs.weatherFactor.toFixed(2)}` });
  }

  if (inputs.eventFactor && inputs.eventFactor > 1) {
    const add = Math.min(0.4, inputs.eventFactor - 1);
    mult += add;
    reasons.push({ label: "event", delta: add, detail: `factor ${inputs.eventFactor.toFixed(2)}` });
  }

  mult = Math.max(SURGE_CONFIG.min, Math.min(SURGE_CONFIG.max, mult));
  mult = Math.round(mult * 100) / 100;

  return {
    multiplier: mult,
    tier: tierFor(mult),
    audit: {
      inputs,
      reasons,
      computedAt: new Date().toISOString(),
      version: SURGE_CONFIG.version,
    },
  };
}

/** Formats the customer-facing transparency string. */
export function explainSurge(decision: SurgeDecision): string {
  if (decision.tier === "none") return "Standard pricing";
  const top = decision.audit.reasons
    .slice()
    .sort((a, b) => b.delta - a.delta)
    .slice(0, 2)
    .map((r) => r.label.replace(/_/g, " "))
    .join(", ");
  return `${decision.multiplier}x surge — ${top}`;
}

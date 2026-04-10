/**
 * coupling-detector — Detects over-coupled modules at runtime.
 * Tracks which modules emit/consume events and flags those with too many cross-domain dependencies.
 * Lightweight — observe-only, zero business logic.
 */

export interface ModuleCouplingReport {
  module: string;
  emitsTo: string[];
  consumesFrom: string[];
  totalDependencies: number;
  couplingScore: number; // 0-100, higher = more coupled
  status: "healthy" | "coupled" | "over-coupled";
  suggestion: string | null;
  flaggedAt: string | null;
}

interface InteractionRecord {
  source: string;
  target: string;
  event: string;
  count: number;
  lastAt: string;
}

const interactions: InteractionRecord[] = [];
const MAX_INTERACTIONS = 500;
const listeners = new Set<() => void>();

function notify() { listeners.forEach(fn => fn()); }

/**
 * Record an inter-module interaction (event emission/consumption).
 * Called by the platform bus bridge.
 */
export function recordInteraction(source: string, target: string, event: string) {
  const existing = interactions.find(i => i.source === source && i.target === target && i.event === event);
  if (existing) {
    existing.count++;
    existing.lastAt = new Date().toISOString();
  } else {
    interactions.push({ source, target, event, count: 1, lastAt: new Date().toISOString() });
    if (interactions.length > MAX_INTERACTIONS) interactions.shift();
  }
  notify();
}

/**
 * Extract module name from an event string.
 * "wallet:payment_completed" → "wallet"
 * "orbit.message.sent" → "orbit"
 */
function extractModule(event: string): string {
  const sep = event.includes(":") ? ":" : ".";
  return event.split(sep)[0].toLowerCase();
}

/**
 * Record an event emission for coupling analysis.
 */
export function trackEventForCoupling(event: string, source: string) {
  const targetModule = extractModule(event);
  if (source && targetModule && source !== targetModule) {
    recordInteraction(source, targetModule, event);
  }
}

/**
 * Compute coupling reports for all known modules.
 */
export function computeCouplingReports(): ModuleCouplingReport[] {
  const moduleSet = new Set<string>();
  for (const i of interactions) {
    moduleSet.add(i.source);
    moduleSet.add(i.target);
  }

  const reports: ModuleCouplingReport[] = [];

  for (const mod of moduleSet) {
    const emitsTo = new Set<string>();
    const consumesFrom = new Set<string>();

    for (const i of interactions) {
      if (i.source === mod) emitsTo.add(i.target);
      if (i.target === mod) consumesFrom.add(i.source);
    }

    const totalDeps = emitsTo.size + consumesFrom.size;
    const couplingScore = Math.min(100, Math.round((totalDeps / Math.max(moduleSet.size, 1)) * 100));

    let status: ModuleCouplingReport["status"] = "healthy";
    let suggestion: string | null = null;

    if (totalDeps >= 8) {
      status = "over-coupled";
      suggestion = `Module "${mod}" has ${totalDeps} cross-domain dependencies — candidate for deeper decomposition.`;
    } else if (totalDeps >= 5) {
      status = "coupled";
      suggestion = `Module "${mod}" has ${totalDeps} dependencies — monitor for growth.`;
    }

    reports.push({
      module: mod,
      emitsTo: Array.from(emitsTo),
      consumesFrom: Array.from(consumesFrom),
      totalDependencies: totalDeps,
      couplingScore,
      status,
      suggestion,
      flaggedAt: status !== "healthy" ? new Date().toISOString() : null,
    });
  }

  return reports.sort((a, b) => b.couplingScore - a.couplingScore);
}

/**
 * Get modules flagged as over-coupled.
 */
export function getOverCoupledModules(): ModuleCouplingReport[] {
  return computeCouplingReports().filter(r => r.status === "over-coupled");
}

export function clearInteractions() { interactions.length = 0; notify(); }
export function subscribeCoupling(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

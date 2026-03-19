/**
 * DINO V5 — Real-Time UX Adaptation Engine
 * Observes live user behavior and suggests layout/flow adjustments.
 */

export interface UxSignal {
  type: "rage_click" | "fast_back" | "abandoned_flow" | "scroll_depth" | "dead_zone" | "slow_page";
  route: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export interface UxAdaptation {
  route: string;
  action: string;
  parameter: string;
  currentValue: string | number;
  suggestedValue: string | number;
  confidence: number; // 0-1
  reason: string;
}

const SIGNAL_BUFFER: UxSignal[] = [];
const MAX_BUFFER = 200;

export function recordUxSignal(signal: UxSignal) {
  SIGNAL_BUFFER.push(signal);
  if (SIGNAL_BUFFER.length > MAX_BUFFER) SIGNAL_BUFFER.shift();
}

export function analyzeUxSignals(route?: string): UxAdaptation[] {
  const signals = route ? SIGNAL_BUFFER.filter(s => s.route === route) : SIGNAL_BUFFER;
  const adaptations: UxAdaptation[] = [];

  // Rage click detection → increase tap target size
  const rageClicks = signals.filter(s => s.type === "rage_click");
  if (rageClicks.length >= 3) {
    adaptations.push({
      route: rageClicks[0].route,
      action: "increase_tap_target",
      parameter: "min-touch-size",
      currentValue: 36,
      suggestedValue: 48,
      confidence: Math.min(1, rageClicks.length / 5),
      reason: `${rageClicks.length} rage clicks detected — users struggling with tap targets`,
    });
  }

  // Fast back navigation → simplify page or improve CTA
  const fastBacks = signals.filter(s => s.type === "fast_back");
  if (fastBacks.length >= 2) {
    adaptations.push({
      route: fastBacks[0].route,
      action: "simplify_layout",
      parameter: "content-density",
      currentValue: "normal",
      suggestedValue: "reduced",
      confidence: Math.min(1, fastBacks.length / 4),
      reason: `${fastBacks.length} fast-back navigations — page may be confusing or irrelevant`,
    });
  }

  // Abandoned flows → reduce steps
  const abandoned = signals.filter(s => s.type === "abandoned_flow");
  if (abandoned.length >= 2) {
    adaptations.push({
      route: abandoned[0].route,
      action: "reduce_flow_steps",
      parameter: "step-count",
      currentValue: "unknown",
      suggestedValue: "fewer",
      confidence: Math.min(1, abandoned.length / 3),
      reason: `${abandoned.length} abandoned flows — consider reducing steps`,
    });
  }

  // Dead zones → reposition CTA
  const deadZones = signals.filter(s => s.type === "dead_zone");
  if (deadZones.length >= 3) {
    adaptations.push({
      route: deadZones[0].route,
      action: "reposition_cta",
      parameter: "cta-position",
      currentValue: "bottom",
      suggestedValue: "above-fold",
      confidence: Math.min(1, deadZones.length / 5),
      reason: `${deadZones.length} dead zones detected — key content may be below fold`,
    });
  }

  // Slow page → suggest optimization
  const slowPages = signals.filter(s => s.type === "slow_page");
  if (slowPages.length >= 1) {
    adaptations.push({
      route: slowPages[0].route,
      action: "optimize_performance",
      parameter: "lazy-loading",
      currentValue: "disabled",
      suggestedValue: "enabled",
      confidence: 0.8,
      reason: `Slow page load detected — enable lazy loading and reduce initial payload`,
    });
  }

  return adaptations;
}

export function getSignalStats() {
  const byType: Record<string, number> = {};
  for (const s of SIGNAL_BUFFER) {
    byType[s.type] = (byType[s.type] ?? 0) + 1;
  }
  return { total: SIGNAL_BUFFER.length, byType };
}

export function clearSignalBuffer() {
  SIGNAL_BUFFER.length = 0;
}

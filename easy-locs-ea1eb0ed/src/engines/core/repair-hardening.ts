import { engineObserver } from "./engine-observer";

export type RepairPriority =
  | "critical_layout"
  | "severe_visibility"
  | "text_integrity"
  | "i18n_surface"
  | "cosmetic_layout";

const PRIORITY_ORDER: Record<RepairPriority, number> = {
  critical_layout: 0,
  severe_visibility: 1,
  text_integrity: 2,
  i18n_surface: 3,
  cosmetic_layout: 4,
};

export function comparePriority(a: RepairPriority, b: RepairPriority): number {
  return PRIORITY_ORDER[a] - PRIORITY_ORDER[b];
}

export function getPriorityRank(p: RepairPriority): number {
  return PRIORITY_ORDER[p];
}

export type RejectionReason =
  | "superseded_by_higher_priority_rule"
  | "invalid_after_revalidation"
  | "insufficient_confidence"
  | "cooldown_active"
  | "budget_exceeded"
  | "storm_suppressed"
  | "oscillation_quarantined"
  | "wrapper_role_uncertain"
  | "interactive_descendants_present"
  | "layout_improvement_not_confirmed"
  | "sensitive_ancestry_detected"
  | "element_not_found"
  | "pipeline_disabled"
  | "domain_blocked"
  | "reality_lock_blocked";

export interface ConfidenceSignals {
  detectorCertainty: number;
  elementVisibility: number;
  elementSizeSanity: number;
  domStability: number;
  selectorSpecificity: number;
  corroboratingSignals: number;
  priorSuccessRate: number;
  metricStrength: number;
}

export interface ConfidenceResult {
  score: number;
  threshold: number;
  signals: ConfidenceSignals;
  passed: boolean;
}

const DEFAULT_CONFIDENCE_THRESHOLD = 0.6;
const WRAPPER_CONFIDENCE_THRESHOLD = 0.8;

const SIGNAL_WEIGHTS: Record<keyof ConfidenceSignals, number> = {
  detectorCertainty: 0.25,
  elementVisibility: 0.15,
  elementSizeSanity: 0.10,
  domStability: 0.10,
  selectorSpecificity: 0.10,
  corroboratingSignals: 0.10,
  priorSuccessRate: 0.10,
  metricStrength: 0.10,
};

export function computeConfidence(signals: ConfidenceSignals): number {
  let total = 0;
  let weightSum = 0;
  for (const key of Object.keys(SIGNAL_WEIGHTS) as (keyof ConfidenceSignals)[]) {
    const w = SIGNAL_WEIGHTS[key];
    const v = Math.max(0, Math.min(1, signals[key]));
    total += w * v;
    weightSum += w;
  }
  return weightSum > 0 ? total / weightSum : 0;
}

export function evaluateConfidence(
  signals: ConfidenceSignals,
  minThreshold: number,
): ConfidenceResult {
  const score = computeConfidence(signals);
  return {
    score,
    threshold: minThreshold,
    signals,
    passed: score >= minThreshold,
  };
}

export function getDefaultThreshold(): number {
  return DEFAULT_CONFIDENCE_THRESHOLD;
}

export function getWrapperThreshold(): number {
  return WRAPPER_CONFIDENCE_THRESHOLD;
}

export interface CooldownPolicy {
  baseCooldownMs: number;
  escalationFactor: number;
  maxCooldownMs: number;
}

const DEFAULT_COOLDOWN_POLICIES: Record<string, CooldownPolicy> = {
  text: { baseCooldownMs: 30_000, escalationFactor: 1.5, maxCooldownMs: 300_000 },
  i18n: { baseCooldownMs: 30_000, escalationFactor: 1.5, maxCooldownMs: 300_000 },
  layout: { baseCooldownMs: 120_000, escalationFactor: 2.0, maxCooldownMs: 600_000 },
  ui: { baseCooldownMs: 60_000, escalationFactor: 1.5, maxCooldownMs: 300_000 },
  wrapper: { baseCooldownMs: 300_000, escalationFactor: 2.0, maxCooldownMs: 1_800_000 },
};

interface ElementCooldownEntry {
  elementId: string;
  ruleId: string;
  lastMutatedAt: number;
  mutationCount: number;
  cooldownUntil: number;
  stateHistory: string[];
}

interface OscillationEntry {
  elementId: string;
  quarantinedAt: number;
  quarantineUntil: number;
  reason: string;
}

const MAX_COOLDOWN_ENTRIES = 500;
const MAX_OSCILLATION_ENTRIES = 200;
const MAX_STATE_HISTORY = 5;
const OSCILLATION_WINDOW_MS = 300_000;
const OSCILLATION_THRESHOLD = 3;
const OSCILLATION_QUARANTINE_MS = 600_000;

const cooldownMap = new Map<string, ElementCooldownEntry>();
const oscillationMap = new Map<string, OscillationEntry>();

function cooldownKey(elementId: string, ruleId: string): string {
  return `${elementId}::${ruleId}`;
}

export function isElementOnCooldown(elementId: string, ruleId: string): boolean {
  const key = cooldownKey(elementId, ruleId);
  const entry = cooldownMap.get(key);
  if (!entry) return false;
  if (Date.now() >= entry.cooldownUntil) {
    return false;
  }
  return true;
}

export function isElementQuarantined(elementId: string): boolean {
  const entry = oscillationMap.get(elementId);
  if (!entry) return false;
  if (Date.now() >= entry.quarantineUntil) {
    oscillationMap.delete(elementId);
    return false;
  }
  return true;
}

export function getCooldownState(elementId: string, ruleId: string): {
  onCooldown: boolean;
  cooldownRemainingMs: number;
  mutationCount: number;
} {
  const key = cooldownKey(elementId, ruleId);
  const entry = cooldownMap.get(key);
  if (!entry) {
    return { onCooldown: false, cooldownRemainingMs: 0, mutationCount: 0 };
  }
  const now = Date.now();
  const remaining = Math.max(0, entry.cooldownUntil - now);
  return {
    onCooldown: remaining > 0,
    cooldownRemainingMs: remaining,
    mutationCount: entry.mutationCount,
  };
}

export function recordElementMutation(
  elementId: string,
  ruleId: string,
  afterStateHash: string,
  policyClass: string,
): void {
  const key = cooldownKey(elementId, ruleId);
  const existing = cooldownMap.get(key);
  const policy = DEFAULT_COOLDOWN_POLICIES[policyClass] ?? DEFAULT_COOLDOWN_POLICIES["ui"];

  const mutationCount = (existing?.mutationCount ?? 0) + 1;
  const escalatedCooldown = Math.min(
    policy.baseCooldownMs * Math.pow(policy.escalationFactor, mutationCount - 1),
    policy.maxCooldownMs,
  );

  const stateHistory = existing?.stateHistory ?? [];
  stateHistory.push(afterStateHash);
  if (stateHistory.length > MAX_STATE_HISTORY) {
    stateHistory.splice(0, stateHistory.length - MAX_STATE_HISTORY);
  }

  cooldownMap.set(key, {
    elementId,
    ruleId,
    lastMutatedAt: Date.now(),
    mutationCount,
    cooldownUntil: Date.now() + escalatedCooldown,
    stateHistory,
  });

  if (cooldownMap.size > MAX_COOLDOWN_ENTRIES) {
    pruneOldestCooldowns();
  }

  checkOscillation(elementId, stateHistory);
}

function checkOscillation(elementId: string, stateHistory: string[]): void {
  if (stateHistory.length < OSCILLATION_THRESHOLD) return;

  const recentStates = stateHistory.slice(-OSCILLATION_THRESHOLD);
  const uniqueStates = new Set(recentStates);

  if (uniqueStates.size <= 2 && recentStates.length >= OSCILLATION_THRESHOLD) {
    const hasToggle = recentStates[0] !== recentStates[1] || recentStates[1] !== recentStates[2];
    if (hasToggle) {
      oscillationMap.set(elementId, {
        elementId,
        quarantinedAt: Date.now(),
        quarantineUntil: Date.now() + OSCILLATION_QUARANTINE_MS,
        reason: `Oscillation detected: ${uniqueStates.size} states over ${recentStates.length} mutations`,
      });

      engineObserver.log("repair-hardening", "repair-hardening", "warn",
        `Element quarantined for oscillation: ${elementId}`);
    }
  }

  if (oscillationMap.size > MAX_OSCILLATION_ENTRIES) {
    pruneExpiredOscillations();
  }
}

function pruneExpiredOscillations(): void {
  const now = Date.now();
  for (const [key, entry] of oscillationMap) {
    if (now >= entry.quarantineUntil) {
      oscillationMap.delete(key);
    }
  }
  if (oscillationMap.size > MAX_OSCILLATION_ENTRIES) {
    const entries = Array.from(oscillationMap.entries())
      .sort((a, b) => a[1].quarantinedAt - b[1].quarantinedAt);
    const toRemove = entries.slice(0, Math.floor(MAX_OSCILLATION_ENTRIES / 4));
    for (const [key] of toRemove) {
      oscillationMap.delete(key);
    }
  }
}

function pruneOldestCooldowns(): void {
  const entries = Array.from(cooldownMap.entries())
    .sort((a, b) => a[1].lastMutatedAt - b[1].lastMutatedAt);
  const toRemove = entries.slice(0, Math.floor(MAX_COOLDOWN_ENTRIES / 4));
  for (const [key] of toRemove) {
    cooldownMap.delete(key);
  }
}

export type MutationCost = 1 | 2 | 3 | 5;

export interface BudgetState {
  totalBudget: number;
  consumed: number;
  remaining: number;
  candidatesSkipped: number;
  breakdown: { ruleId: string; cost: number }[];
}

const BASE_BUDGET = 10;
const MIN_BUDGET = 3;

let cycleBudget = BASE_BUDGET;
let cycleConsumed = 0;
let cycleSkipped = 0;
let cycleBreakdown: { ruleId: string; cost: number }[] = [];

export function resetBudget(pageComplexity: number = 1.0, stormLevel: StormLevel = "normal"): void {
  let budget = Math.round(BASE_BUDGET * Math.max(0.5, Math.min(2.0, pageComplexity)));

  if (stormLevel === "degraded") budget = Math.max(MIN_BUDGET, Math.round(budget * 0.5));
  if (stormLevel === "storm") budget = MIN_BUDGET;
  if (stormLevel === "quarantined") budget = 0;

  cycleBudget = budget;
  cycleConsumed = 0;
  cycleSkipped = 0;
  cycleBreakdown = [];
}

export function canAffordMutation(cost: MutationCost): boolean {
  return cycleConsumed + cost <= cycleBudget;
}

export function consumeBudget(ruleId: string, cost: MutationCost): boolean {
  if (!canAffordMutation(cost)) {
    cycleSkipped++;
    return false;
  }
  cycleConsumed += cost;
  cycleBreakdown.push({ ruleId, cost });
  return true;
}

export function skipBudget(): void {
  cycleSkipped++;
}

export function getBudgetState(): BudgetState {
  return {
    totalBudget: cycleBudget,
    consumed: cycleConsumed,
    remaining: cycleBudget - cycleConsumed,
    candidatesSkipped: cycleSkipped,
    breakdown: [...cycleBreakdown],
  };
}

export type StormLevel = "normal" | "degraded" | "storm" | "quarantined";

interface StormState {
  level: StormLevel;
  eventCount: number;
  windowStartMs: number;
  transitionedAt: number;
  recoveryAt: number | null;
  recentDomains: Map<string, number>;
  recentRequeues: number;
  overBudgetCycles: number;
}

const STORM_WINDOW_MS = 30_000;
const DEGRADED_EVENT_THRESHOLD = 15;
const STORM_EVENT_THRESHOLD = 30;
const QUARANTINE_EVENT_THRESHOLD = 60;
const DOMAIN_CONCENTRATION_THRESHOLD = 0.7;
const REQUEUE_THRESHOLD = 10;
const OVER_BUDGET_THRESHOLD = 3;
const STORM_RECOVERY_MS = 120_000;
const QUARANTINE_RECOVERY_MS = 300_000;

const stormState: StormState = {
  level: "normal",
  eventCount: 0,
  windowStartMs: Date.now(),
  transitionedAt: Date.now(),
  recoveryAt: null,
  recentDomains: new Map(),
  recentRequeues: 0,
  overBudgetCycles: 0,
};

export function recordStormEvent(domain: string): void {
  const now = Date.now();

  if (now - stormState.windowStartMs > STORM_WINDOW_MS) {
    stormState.eventCount = 0;
    stormState.windowStartMs = now;
    stormState.recentDomains.clear();
    stormState.recentRequeues = 0;
  }

  stormState.eventCount++;
  stormState.recentDomains.set(domain, (stormState.recentDomains.get(domain) ?? 0) + 1);

  evaluateStormLevel();
}

export function recordRequeue(): void {
  stormState.recentRequeues++;
  if (stormState.recentRequeues >= REQUEUE_THRESHOLD) {
    evaluateStormLevel();
  }
}

export function recordOverBudgetCycle(): void {
  stormState.overBudgetCycles++;
  if (stormState.overBudgetCycles >= OVER_BUDGET_THRESHOLD) {
    evaluateStormLevel();
  }
}

function evaluateStormLevel(): void {
  const prevLevel = stormState.level;
  const now = Date.now();

  if (stormState.recoveryAt && now >= stormState.recoveryAt) {
    stormState.level = "normal";
    stormState.recoveryAt = null;
    stormState.overBudgetCycles = 0;
    if (prevLevel !== "normal") {
      engineObserver.log("repair-hardening", "repair-hardening", "info",
        `Storm recovered: ${prevLevel} → normal`);
    }
    return;
  }

  const hasDomainConcentration = checkDomainConcentration();
  const effectiveCount = stormState.eventCount
    + (hasDomainConcentration ? 10 : 0)
    + (stormState.recentRequeues >= REQUEUE_THRESHOLD ? 10 : 0)
    + (stormState.overBudgetCycles >= OVER_BUDGET_THRESHOLD ? 10 : 0);

  let newLevel: StormLevel = "normal";
  if (effectiveCount >= QUARANTINE_EVENT_THRESHOLD) {
    newLevel = "quarantined";
  } else if (effectiveCount >= STORM_EVENT_THRESHOLD) {
    newLevel = "storm";
  } else if (effectiveCount >= DEGRADED_EVENT_THRESHOLD) {
    newLevel = "degraded";
  }

  if (newLevel !== prevLevel) {
    stormState.level = newLevel;
    stormState.transitionedAt = now;

    if (newLevel === "quarantined") {
      stormState.recoveryAt = now + QUARANTINE_RECOVERY_MS;
    } else if (newLevel === "storm" || newLevel === "degraded") {
      stormState.recoveryAt = now + STORM_RECOVERY_MS;
    } else {
      stormState.recoveryAt = null;
    }

    engineObserver.log("repair-hardening", "repair-hardening",
      newLevel === "normal" ? "info" : "warn",
      `Storm transition: ${prevLevel} → ${newLevel} (events=${stormState.eventCount} requeues=${stormState.recentRequeues} overBudget=${stormState.overBudgetCycles})`);
  }
}

function checkDomainConcentration(): boolean {
  if (stormState.eventCount < 5) return false;
  for (const count of stormState.recentDomains.values()) {
    if (count / stormState.eventCount >= DOMAIN_CONCENTRATION_THRESHOLD) {
      return true;
    }
  }
  return false;
}

export function getStormLevel(): StormLevel {
  if (stormState.recoveryAt && Date.now() >= stormState.recoveryAt) {
    stormState.level = "normal";
    stormState.recoveryAt = null;
  }
  return stormState.level;
}

export function getStormState(): {
  level: StormLevel;
  eventCount: number;
  transitionedAt: number;
  recoveryAt: number | null;
} {
  return {
    level: getStormLevel(),
    eventCount: stormState.eventCount,
    transitionedAt: stormState.transitionedAt,
    recoveryAt: stormState.recoveryAt,
  };
}

export function getConfidenceThresholdForStorm(baseThreshold: number, storm: StormLevel): number {
  switch (storm) {
    case "normal": return baseThreshold;
    case "degraded": return Math.min(1.0, baseThreshold + 0.1);
    case "storm": return Math.min(1.0, baseThreshold + 0.2);
    case "quarantined": return 1.1;
  }
}

export function shouldSuppressByPriority(priority: RepairPriority, storm: StormLevel): boolean {
  if (storm === "quarantined") return true;
  if (storm === "storm" && PRIORITY_ORDER[priority] >= PRIORITY_ORDER["i18n_surface"]) return true;
  if (storm === "degraded" && PRIORITY_ORDER[priority] >= PRIORITY_ORDER["cosmetic_layout"]) return true;
  return false;
}

export interface WrapperValidationResult {
  safe: boolean;
  reason: RejectionReason | null;
  overflowConfirmed: boolean;
  hasInteractiveDescendants: boolean;
  hasSensitiveAncestry: boolean;
  hasAnimationRisk: boolean;
}

const SENSITIVE_ANCESTOR_SELECTORS = [
  "form", "[data-auth]", "[data-payment-form]", "[data-wallet-form]",
  "[role='dialog']", "[data-modal]", "[data-overlay]",
];

const INTERACTIVE_SELECTORS = [
  "input", "select", "textarea", "button[type='submit']",
  "[contenteditable]", "[role='slider']", "[role='spinbutton']",
];

const ANIMATION_INDICATORS = [
  "data-framer-appear-id", "data-motion-pop-id",
];

export function validateWrapperForRepair(el: HTMLElement): WrapperValidationResult {
  const result: WrapperValidationResult = {
    safe: true,
    reason: null,
    overflowConfirmed: false,
    hasInteractiveDescendants: false,
    hasSensitiveAncestry: false,
    hasAnimationRisk: false,
  };

  for (const sel of SENSITIVE_ANCESTOR_SELECTORS) {
    if (el.closest(sel)) {
      result.safe = false;
      result.reason = "sensitive_ancestry_detected";
      result.hasSensitiveAncestry = true;
      return result;
    }
  }

  for (const sel of INTERACTIVE_SELECTORS) {
    if (el.querySelector(sel)) {
      result.safe = false;
      result.reason = "interactive_descendants_present";
      result.hasInteractiveDescendants = true;
      return result;
    }
  }

  for (const attr of ANIMATION_INDICATORS) {
    if (el.hasAttribute(attr) || el.querySelector(`[${attr}]`)) {
      result.hasAnimationRisk = true;
      break;
    }
  }

  const style = window.getComputedStyle(el);
  const hasOverflow = (style.overflow === "hidden" || style.overflow === "clip") &&
    (el.scrollWidth > el.clientWidth + 2 || el.scrollHeight > el.clientHeight + 2);
  result.overflowConfirmed = hasOverflow;

  if (!hasOverflow) {
    result.safe = false;
    result.reason = "wrapper_role_uncertain";
    return result;
  }

  if (result.hasAnimationRisk) {
    result.safe = false;
    result.reason = "wrapper_role_uncertain";
    return result;
  }

  return result;
}

export function validateWrapperImprovement(
  el: HTMLElement,
  beforeOverflowX: number,
  beforeOverflowY: number,
): boolean {
  const afterOverflowX = Math.max(0, el.scrollWidth - el.clientWidth);
  const afterOverflowY = Math.max(0, el.scrollHeight - el.clientHeight);

  const improvedX = afterOverflowX < beforeOverflowX;
  const improvedY = afterOverflowY < beforeOverflowY;
  const noWorse = afterOverflowX <= beforeOverflowX && afterOverflowY <= beforeOverflowY;

  return (improvedX || improvedY) && noWorse;
}

export function buildConfidenceSignals(
  detectorCertainty: number,
  element: HTMLElement | null,
  priorSuccessRate: number,
  corroboratingCount: number,
): ConfidenceSignals {
  let elementVisibility = 0;
  let elementSizeSanity = 0;
  let domStability = 1.0;
  let selectorSpecificity = 0.5;

  if (element) {
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);
    elementVisibility = (style.display !== "none" && style.visibility !== "hidden" && style.opacity !== "0")
      ? (rect.width > 0 && rect.height > 0 ? 1.0 : 0.3)
      : 0.0;

    elementSizeSanity = (rect.width > 10 && rect.height > 10 && rect.width < 3000 && rect.height < 5000) ? 1.0 : 0.3;

    if (element.id) selectorSpecificity = 1.0;
    else if (element.dataset.card || element.dataset.testid) selectorSpecificity = 0.8;
    else if (element.className) selectorSpecificity = 0.5;
    else selectorSpecificity = 0.3;
  }

  const metricStrength = detectorCertainty > 0.7 ? 1.0 : detectorCertainty > 0.4 ? 0.6 : 0.3;

  return {
    detectorCertainty,
    elementVisibility,
    elementSizeSanity,
    domStability,
    selectorSpecificity,
    corroboratingSignals: Math.min(1.0, corroboratingCount / 3),
    priorSuccessRate,
    metricStrength,
  };
}

export function resetHardeningState(): void {
  cooldownMap.clear();
  oscillationMap.clear();
  resetBudget();
  stormState.level = "normal";
  stormState.eventCount = 0;
  stormState.windowStartMs = Date.now();
  stormState.transitionedAt = Date.now();
  stormState.recoveryAt = null;
  stormState.recentDomains.clear();
  stormState.recentRequeues = 0;
  stormState.overBudgetCycles = 0;
}

export function getHardeningReport() {
  return {
    storm: getStormState(),
    budget: getBudgetState(),
    cooldownEntries: cooldownMap.size,
    oscillationQuarantines: oscillationMap.size,
    quarantinedElements: Array.from(oscillationMap.entries())
      .filter(([, e]) => Date.now() < e.quarantineUntil)
      .map(([id, e]) => ({ id, reason: e.reason, until: e.quarantineUntil })),
  };
}

/**
 * PASS55 Block AT — Feature Flag System
 * Progressive rollout, A/B testing, and user-segment targeting.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export type FlagValue = boolean | string | number;

export interface FeatureFlag {
  key: string;
  defaultValue: FlagValue;
  description?: string;
  /** Percentage of users (0–100) who see this flag enabled */
  rolloutPercent?: number;
  /** Enable only for specific user IDs */
  allowedUsers?: string[];
  /** Enable only for specific org IDs */
  allowedOrgs?: string[];
  /** A/B test variant assignment */
  variants?: Record<string, number>; // variant_name → weight
  /** Expiry date after which flag is auto-removed */
  expiresAt?: string;
  /** Override env: only active in dev/prod/all */
  env?: "development" | "production" | "all";
}

interface FlagOverride {
  key: string;
  value: FlagValue;
  source: "local" | "remote" | "url";
}

// ─── Registry ────────────────────────────────────────────────────────────────

const flagRegistry = new Map<string, FeatureFlag>();
const overrides = new Map<string, FlagOverride>();
const listeners = new Map<string, Set<(value: FlagValue) => void>>();

/** Register a feature flag */
export function registerFlag(flag: FeatureFlag): void {
  flagRegistry.set(flag.key, flag);
}

/** Register multiple flags at once */
export function registerFlags(flags: FeatureFlag[]): void {
  flags.forEach(registerFlag);
}

/** Override a flag value locally (dev/testing) */
export function overrideFlag(key: string, value: FlagValue, source: FlagOverride["source"] = "local"): void {
  overrides.set(key, { key, value, source });
  notifyListeners(key, value);
}

/** Clear a local override */
export function clearOverride(key: string): void {
  overrides.delete(key);
}

/** Clear all overrides */
export function clearAllOverrides(): void {
  overrides.clear();
}

// ─── Evaluation ──────────────────────────────────────────────────────────────

interface EvalContext {
  userId?: string;
  orgId?: string;
  env?: "development" | "production";
}

/** Deterministic hash for consistent rollout */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

/** Evaluate a feature flag for a given context */
export function evaluateFlag(key: string, context: EvalContext = {}): FlagValue {
  // Check overrides first
  const override = overrides.get(key);
  if (override) return override.value;

  const flag = flagRegistry.get(key);
  if (!flag) return false;

  // Check expiry
  if (flag.expiresAt && new Date(flag.expiresAt) < new Date()) return flag.defaultValue;

  // Check env constraint
  if (flag.env && flag.env !== "all") {
    const currentEnv = context.env ?? (import.meta.env.DEV ? "development" : "production");
    if (flag.env !== currentEnv) return flag.defaultValue;
  }

  // Check user allowlist
  if (flag.allowedUsers?.length && context.userId) {
    if (flag.allowedUsers.includes(context.userId)) return true;
  }

  // Check org allowlist
  if (flag.allowedOrgs?.length && context.orgId) {
    if (flag.allowedOrgs.includes(context.orgId)) return true;
  }

  // Check rollout percentage
  if (flag.rolloutPercent !== undefined && context.userId) {
    const bucket = hashString(`${key}:${context.userId}`) % 100;
    if (bucket >= flag.rolloutPercent) return flag.defaultValue;
    return typeof flag.defaultValue === "boolean" ? true : flag.defaultValue;
  }

  // A/B variant assignment
  if (flag.variants && context.userId) {
    const entries = Object.entries(flag.variants);
    const totalWeight = entries.reduce((sum, [, w]) => sum + w, 0);
    const bucket = hashString(`${key}:ab:${context.userId}`) % totalWeight;
    let cumulative = 0;
    for (const [variant, weight] of entries) {
      cumulative += weight;
      if (bucket < cumulative) return variant;
    }
    return entries[0]?.[0] ?? flag.defaultValue;
  }

  return flag.defaultValue;
}

/** Shortcut: check if a boolean flag is enabled */
export function isEnabled(key: string, context: EvalContext = {}): boolean {
  return evaluateFlag(key, context) === true;
}

/** Get assigned A/B variant */
export function getVariant(key: string, context: EvalContext = {}): string {
  const val = evaluateFlag(key, context);
  return typeof val === "string" ? val : "control";
}

// ─── Listeners ───────────────────────────────────────────────────────────────

function notifyListeners(key: string, value: FlagValue) {
  listeners.get(key)?.forEach((fn) => { try { fn(value); } catch {} });
}

/** Subscribe to flag value changes */
export function onFlagChange(key: string, handler: (value: FlagValue) => void): () => void {
  if (!listeners.has(key)) listeners.set(key, new Set());
  listeners.get(key)!.add(handler);
  return () => listeners.get(key)?.delete(handler);
}

// ─── URL Override Parser ─────────────────────────────────────────────────────

/** Parse feature flags from URL search params (e.g., ?ff_dark_mode=true) */
export function parseUrlFlags(): void {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams(window.location.search);
  params.forEach((value, key) => {
    if (!key.startsWith("ff_")) return;
    const flagKey = key.slice(3);
    const parsed = value === "true" ? true : value === "false" ? false : isNaN(Number(value)) ? value : Number(value);
    overrideFlag(flagKey, parsed, "url");
  });
}

// ─── Analytics Integration ───────────────────────────────────────────────────

/** Get all active flag evaluations for analytics */
export function getActiveFlags(context: EvalContext = {}): Record<string, FlagValue> {
  const result: Record<string, FlagValue> = {};
  flagRegistry.forEach((_, key) => {
    result[key] = evaluateFlag(key, context);
  });
  return result;
}

/** Get all registered flags for debugging */
export function getAllFlags(): FeatureFlag[] {
  return Array.from(flagRegistry.values());
}

/** Get flag count */
export function getFlagCount(): number {
  return flagRegistry.size;
}

/**
 * Engine Rollout Control — Shadow / Assist / Execute modes with kill switches.
 *
 * GOVERNANCE:
 * - shadow: engine runs, decisions logged only, zero user impact
 * - assist: engine suggests/scores, limited user-facing effect, no irreversible automation
 * - execute: engine actively publishes/ranks/displays/dispatches
 * - disabled: engine is off
 *
 * Every engine starts in shadow mode. Promotion requires explicit flag flip.
 * Kill switches can instantly demote any engine to disabled.
 */

export type RolloutMode = "disabled" | "shadow" | "assist" | "execute";

export interface EngineRolloutConfig {
  mode: RolloutMode;
  /** Per-city override: city key → mode */
  cityOverrides?: Record<string, RolloutMode>;
  /** Per-zone override: zone_key → mode */
  zoneOverrides?: Record<string, RolloutMode>;
  /** Per-category override: vertical → mode */
  categoryOverrides?: Record<string, RolloutMode>;
  /** Kill switch: if true, engine is force-disabled regardless of mode */
  killed: boolean;
  /** Safety threshold: engine auto-disables if error rate exceeds this (0-1) */
  safetyThreshold: number;
  /** Current error count for auto-disable */
  errorCount: number;
  /** Total run count for rate calculation */
  runCount: number;
  /** Last mode change timestamp */
  lastModeChange: string;
}

/** Default rollout config — all engines start in shadow */
function defaultConfig(): EngineRolloutConfig {
  return {
    mode: "shadow",
    killed: false,
    safetyThreshold: 0.15, // 15% error rate = auto-disable
    errorCount: 0,
    runCount: 0,
    lastModeChange: new Date().toISOString(),
  };
}

/** Engine rollout state — runtime mutable */
const ENGINE_ROLLOUT: Record<string, EngineRolloutConfig> = {};

/** Get effective mode for an engine in a specific context */
export function getEffectiveMode(
  engineName: string,
  context?: { city?: string; zone?: string; category?: string },
): RolloutMode {
  const config = ENGINE_ROLLOUT[engineName] ?? defaultConfig();

  // Kill switch overrides everything
  if (config.killed) return "disabled";

  // Safety auto-disable
  if (config.runCount > 10 && config.errorCount / config.runCount > config.safetyThreshold) {
    return "disabled";
  }

  // Context-specific overrides (most specific wins)
  if (context?.zone && config.zoneOverrides?.[context.zone]) {
    return config.zoneOverrides[context.zone];
  }
  if (context?.city && config.cityOverrides?.[context.city]) {
    return config.cityOverrides[context.city];
  }
  if (context?.category && config.categoryOverrides?.[context.category]) {
    return config.categoryOverrides[context.category];
  }

  return config.mode;
}

/** Promote an engine to a higher mode */
export function promoteEngine(engineName: string, targetMode: RolloutMode): void {
  if (!ENGINE_ROLLOUT[engineName]) ENGINE_ROLLOUT[engineName] = defaultConfig();
  ENGINE_ROLLOUT[engineName].mode = targetMode;
  ENGINE_ROLLOUT[engineName].lastModeChange = new Date().toISOString();
}

/** Kill switch — immediately disable an engine */
export function killEngine(engineName: string): void {
  if (!ENGINE_ROLLOUT[engineName]) ENGINE_ROLLOUT[engineName] = defaultConfig();
  ENGINE_ROLLOUT[engineName].killed = true;
}

/** Revive a killed engine (returns to its previous mode) */
export function reviveEngine(engineName: string): void {
  if (ENGINE_ROLLOUT[engineName]) {
    ENGINE_ROLLOUT[engineName].killed = false;
  }
}

/** Record engine execution result for safety monitoring */
export function recordEngineRun(engineName: string, success: boolean): void {
  if (!ENGINE_ROLLOUT[engineName]) ENGINE_ROLLOUT[engineName] = defaultConfig();
  ENGINE_ROLLOUT[engineName].runCount++;
  if (!success) ENGINE_ROLLOUT[engineName].errorCount++;
}

/** Set per-city override */
export function setCityOverride(engineName: string, city: string, mode: RolloutMode): void {
  if (!ENGINE_ROLLOUT[engineName]) ENGINE_ROLLOUT[engineName] = defaultConfig();
  if (!ENGINE_ROLLOUT[engineName].cityOverrides) ENGINE_ROLLOUT[engineName].cityOverrides = {};
  ENGINE_ROLLOUT[engineName].cityOverrides![city] = mode;
}

/** Set per-zone override */
export function setZoneOverride(engineName: string, zone: string, mode: RolloutMode): void {
  if (!ENGINE_ROLLOUT[engineName]) ENGINE_ROLLOUT[engineName] = defaultConfig();
  if (!ENGINE_ROLLOUT[engineName].zoneOverrides) ENGINE_ROLLOUT[engineName].zoneOverrides = {};
  ENGINE_ROLLOUT[engineName].zoneOverrides![zone] = mode;
}

/** Set per-category override */
export function setCategoryOverride(engineName: string, category: string, mode: RolloutMode): void {
  if (!ENGINE_ROLLOUT[engineName]) ENGINE_ROLLOUT[engineName] = defaultConfig();
  if (!ENGINE_ROLLOUT[engineName].categoryOverrides) ENGINE_ROLLOUT[engineName].categoryOverrides = {};
  ENGINE_ROLLOUT[engineName].categoryOverrides![category] = mode;
}

/** Check if engine is allowed to make user-facing changes */
export function canAffectUser(engineName: string, context?: { city?: string; zone?: string; category?: string }): boolean {
  const mode = getEffectiveMode(engineName, context);
  return mode === "assist" || mode === "execute";
}

/** Check if engine is allowed to make irreversible changes */
export function canExecuteIrreversible(engineName: string, context?: { city?: string; zone?: string; category?: string }): boolean {
  return getEffectiveMode(engineName, context) === "execute";
}

/** Get full rollout status for dashboard */
export function getRolloutDashboard(): Record<string, { mode: RolloutMode; killed: boolean; errorRate: number }> {
  const result: Record<string, { mode: RolloutMode; killed: boolean; errorRate: number }> = {};
  for (const [name, config] of Object.entries(ENGINE_ROLLOUT)) {
    result[name] = {
      mode: config.killed ? "disabled" : config.mode,
      killed: config.killed,
      errorRate: config.runCount > 0 ? config.errorCount / config.runCount : 0,
    };
  }
  return result;
}

/** Batch promote engines by brain owner */
export function promoteBrainEngines(
  brainOwner: string,
  targetMode: RolloutMode,
  engineNames: string[],
): void {
  for (const name of engineNames) {
    promoteEngine(name, targetMode);
  }
}

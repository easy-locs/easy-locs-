import type { EvolutionConfig } from './types';

const DEFAULTS: EvolutionConfig = {
  MAX_CONCURRENT_TASKS: 3,
  MAX_PROPOSALS_PER_CYCLE: 10,
  MAX_PIPELINE_DEPTH: 2,
  MAX_ITERATIONS_PER_CYCLE: 50,
  CYCLE_COOLDOWN_MS: 60_000,
  REJECTION_ESCALATION_THRESHOLD: 5,
  BAN_DURATION_MS: 24 * 60 * 60 * 1000,
  LEVEL_D_ENABLED: false,
};

let current: EvolutionConfig = { ...DEFAULTS };
const overrideListeners: Array<(c: EvolutionConfig) => void> = [];

export function getEvolutionConfig(): EvolutionConfig {
  return { ...current };
}

export function setEvolutionConfig(patch: Partial<EvolutionConfig>): EvolutionConfig {
  const next: EvolutionConfig = { ...current, ...patch };

  if (patch.LEVEL_D_ENABLED === true && current.LEVEL_D_ENABLED === false) {
    // Hard guard: Level D unlock requires explicit opt-in via env or
    // platform-admin proof. We refuse silent flips from arbitrary callers
    // unless the host environment opts in.
    const envFlag =
      typeof process !== 'undefined' &&
      process.env &&
      process.env.DEVOS_LEVEL_D_ALLOW === 'true';
    if (!envFlag) {
      next.LEVEL_D_ENABLED = false;
    }
  }

  current = next;
  for (const fn of overrideListeners) fn(current);
  return { ...current };
}

export function resetEvolutionConfig(): EvolutionConfig {
  current = { ...DEFAULTS };
  for (const fn of overrideListeners) fn(current);
  return { ...current };
}

export function onConfigChange(fn: (c: EvolutionConfig) => void): () => void {
  overrideListeners.push(fn);
  return () => {
    const idx = overrideListeners.indexOf(fn);
    if (idx >= 0) overrideListeners.splice(idx, 1);
  };
}

export const EVOLUTION_DEFAULTS: EvolutionConfig = { ...DEFAULTS };

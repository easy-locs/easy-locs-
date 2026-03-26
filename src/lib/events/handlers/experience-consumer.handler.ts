/**
 * Experience Consumer Handler — wires zone intelligence → Experience Brain
 * 
 * Owner: Experience Brain
 * 
 * Listens to zone.pressure.updated (combined summary of all signals)
 * and refreshes the experience output via canonical event emission.
 * 
 * This ensures that demand/supply/traffic/weather/safety changes
 * cascade into suggestion/trending/prompt surfaces automatically.
 * 
 * Emits:
 * - experience.suggestions.updated
 * - experience.trending.updated
 * - experience.prompts.updated
 */
import { eventBus } from "@/lib/core/event-bus";
import { deriveExecutionState, type ExecutionBrainState } from "@/lib/brain/execution-brain";
import { computeExperienceBrain, type ExperienceBrainOutput } from "@/lib/brain/experience-brain";
import type { GeoLiveStation } from "@/lib/radar/eta-projection-engine";

let _lastOutput: ExperienceBrainOutput | null = null;

/**
 * Rebuild execution state from zone.pressure.updated payload
 * (which carries the full supply/demand/traffic/weather/safety/merchants breakdown)
 */
function payloadToExecState(payload: Record<string, any>): ExecutionBrainState {
  return {
    station: null,
    etas: { food: null, grocery: null, taxi: null, parcel: null },
    overlay: null,
    weather: payload.weather ?? { type: null, intensity: 0, isStorm: false },
    traffic: payload.traffic ?? { level: null, speedFactor: 1, isSevere: false },
    supply: payload.supply ?? { riderCount: 0, isLow: true, factor: 0 },
    demand: payload.demand ?? { level: 0, multiplier: 1, isHigh: false, surgeActive: false, surgeMultiplier: 1 },
    safety: payload.safety ?? { floodRisk: null, isBlocked: false },
    merchants: payload.merchants ?? { total: 0, open: 0, deliverable: 0 },
  };
}

eventBus.on("zone.pressure.updated", (payload) => {
  const p = payload as Record<string, any>;
  const zoneKey = p.zoneKey as string;
  if (!zoneKey) return;

  const exec = payloadToExecState(p);
  const output = computeExperienceBrain(exec);

  // Emit canonical experience events
  void eventBus.emit("experience.suggestions.updated", {
    zoneKey,
    suggestions: output.suggestions,
    count: output.suggestions.length,
    updatedAt: p.updatedAt,
  });

  void eventBus.emit("experience.trending.updated", {
    zoneKey,
    trending: output.trending,
    count: output.trending.length,
    updatedAt: p.updatedAt,
  });

  void eventBus.emit("experience.prompts.updated", {
    zoneKey,
    safetyPrompts: output.safetyPrompts,
    count: output.safetyPrompts.length,
    updatedAt: p.updatedAt,
  });

  _lastOutput = output;

  if (import.meta.env.DEV) {
    console.log(`[experience-consumer] ${zoneKey}`, {
      suggestions: output.suggestions.map(s => s.id),
      trending: output.trending.map(t => t.id),
      safetyPrompts: output.safetyPrompts.map(p => p.id),
    });
  }
});

/** Get last computed experience output (sync read) */
export function peekExperienceOutput(): ExperienceBrainOutput | null {
  return _lastOutput;
}

console.log("[experience-consumer] Experience consumer handler registered");

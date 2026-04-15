/**
 * Experience Consumer Handler — wires zone intelligence → Experience Brain
 * 
 * Owner: Experience Brain
 * 
 * Listens to zone:pressure_updated and refreshes the experience output.
 * 
 * Emits:
 * - experience:suggestions_updated
 * - experience:trending_updated
 * - experience:prompts_updated
 */
import { platformBus } from "@/lib/shared/platform-bus";
import { deriveExecutionState, type ExecutionBrainState } from "@/lib/brain/execution-brain";
import { computeExperienceBrain, type ExperienceBrainOutput } from "@/lib/brain/experience-brain";
import type { GeoLiveStation } from "@/lib/radar/eta-projection-engine";

let _lastOutput: ExperienceBrainOutput | null = null;

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

platformBus.on("zone:pressure_updated", (event) => {
  const p = event.payload as Record<string, any>;
  const zoneKey = p.zoneKey as string;
  if (!zoneKey) return;

  const exec = payloadToExecState(p);
  const output = computeExperienceBrain(exec);

  platformBus.emit("experience:suggestions_updated", {
    zoneKey,
    suggestions: output.suggestions,
    count: output.suggestions.length,
    updatedAt: p.updatedAt,
  }, "system");

  platformBus.emit("experience:trending_updated", {
    zoneKey,
    trending: output.trending,
    count: output.trending.length,
    updatedAt: p.updatedAt,
  }, "system");

  platformBus.emit("experience:prompts_updated", {
    zoneKey,
    safetyPrompts: output.safetyPrompts,
    count: output.safetyPrompts.length,
    updatedAt: p.updatedAt,
  }, "system");

  _lastOutput = output;

  if (import.meta.env.DEV) {
    console.log(`[experience-consumer] ${zoneKey}`, {
      suggestions: output.suggestions.map(s => s.id),
      trending: output.trending.map(t => t.id),
      safetyPrompts: output.safetyPrompts.map(p => p.id),
    });
  }
});

export function peekExperienceOutput(): ExperienceBrainOutput | null {
  return _lastOutput;
}

if (import.meta.env.DEV) console.log("[experience-consumer] Experience consumer handler registered");

/**
 * ETA Trust Engine — weather/traffic adjustments, floor enforcement.
 */
import type { ETAProjection } from "@/lib/radar/eta-projection-engine";
import type { ArbitrationInput, ArbitrationDecision } from "./types";
import { DecisionPriority } from "./types";

export function arbitrateETA(input: ArbitrationInput): { decisions: ArbitrationDecision[]; adjustedETAs: ETAProjection } {
  const decisions: ArbitrationDecision[] = [];
  const { station, etas } = input;
  const adjustedETAs: ETAProjection = { ...etas };

  if (station.weather_type === "storm" || station.weather_intensity > 0.8) {
    const buffer = Math.round(station.weather_intensity * 8);
    for (const cat of ["food", "grocery", "taxi", "parcel"] as const) {
      if (adjustedETAs[cat] != null) {
        adjustedETAs[cat] = adjustedETAs[cat]! + buffer;
        decisions.push({
          module: "eta", action: "add_buffer", category: cat, bufferMinutes: buffer,
          reason: `Severe weather (${station.weather_type}, intensity ${station.weather_intensity})`,
          priority: DecisionPriority.SAFETY,
        });
      }
    }
  }

  if (station.traffic_level === "heavy" || station.traffic_level === "severe") {
    const trafficBuffer = station.traffic_level === "severe" ? 10 : 5;
    for (const cat of ["food", "grocery", "parcel"] as const) {
      if (adjustedETAs[cat] != null) adjustedETAs[cat] = adjustedETAs[cat]! + trafficBuffer;
    }
    if (adjustedETAs.taxi != null) adjustedETAs.taxi = adjustedETAs.taxi! + Math.round(trafficBuffer * 0.6);
  }

  const ETA_FLOORS: Record<string, number> = { food: 8, grocery: 12, taxi: 3, parcel: 10 };
  for (const cat of ["food", "grocery", "taxi", "parcel"] as const) {
    const floor = ETA_FLOORS[cat];
    if (adjustedETAs[cat] != null && adjustedETAs[cat]! < floor) {
      decisions.push({
        module: "eta", action: "block_promise", category: cat,
        reason: `ETA ${adjustedETAs[cat]}min below realistic floor ${floor}min`,
        priority: DecisionPriority.OPERATIONAL_TRUTH,
      });
      adjustedETAs[cat] = floor;
    }
  }

  if (station.rider_supply === 0) {
    for (const cat of ["food", "grocery", "parcel"] as const) {
      if (adjustedETAs[cat] != null) {
        decisions.push({
          module: "eta", action: "block_promise", category: cat,
          reason: "Zero riders available in zone",
          priority: DecisionPriority.OPERATIONAL_TRUTH,
        });
        adjustedETAs[cat] = null;
      }
    }
  }

  return { decisions, adjustedETAs };
}

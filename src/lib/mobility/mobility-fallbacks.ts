/**
 * mobility-fallbacks — Safe defaults for zone, ETA, pricing when live data unavailable.
 */

export function fallbackZoneIntelligence() {
  return {
    demand: 20,
    supply: 10,
    traffic: "moderate" as const,
    weather: "clear" as const,
  };
}

export function fallbackETA(distanceKm: number) {
  return Math.max(4, Math.round(distanceKm * 2.5));
}

export function fallbackPricing(distanceKm: number, durationMin: number) {
  return {
    baseFare: 6,
    distanceFare: distanceKm * 2.2,
    timeFare: durationMin * 0.5,
    trafficMultiplier: 1,
    demandMultiplier: 1,
    weatherMultiplier: 1,
    surgeMultiplier: 1,
    finalPrice: Math.max(8, Math.round(6 + distanceKm * 2.2 + durationMin * 0.5)),
    explanation_json: { fallback: true },
  };
}

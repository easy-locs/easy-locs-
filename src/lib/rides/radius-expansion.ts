/**
 * Radius Expansion — Progressive search radius steps for driver discovery.
 */

export interface RadiusStep {
  radiusKm: number;
  maxDrivers: number;
}

export const DEFAULT_RADIUS_STEPS: RadiusStep[] = [
  { radiusKm: 6, maxDrivers: 6 },
  { radiusKm: 10, maxDrivers: 10 },
  { radiusKm: 15, maxDrivers: 14 },
  { radiusKm: 22, maxDrivers: 18 },
];

export function getNextRadiusStep(
  currentIndex: number,
  steps: RadiusStep[] = DEFAULT_RADIUS_STEPS,
): RadiusStep | null {
  if (currentIndex < 0) return steps[0] ?? null;
  if (currentIndex + 1 >= steps.length) return null;
  return steps[currentIndex + 1];
}

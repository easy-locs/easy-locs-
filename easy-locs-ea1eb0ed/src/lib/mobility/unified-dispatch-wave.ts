/**
 * Unified Dispatch Wave — profiled wave slicing for all mobility contexts.
 */
import { getMobilityProfile } from "./mobility-profiles";
import type { MobilityContext, UnifiedDriverScore } from "./unified-mobility.types";

export function sliceDispatchWave(
  context: MobilityContext,
  scoredDrivers: UnifiedDriverScore[],
  waveNumber: 1 | 2 | 3,
) {
  const profile = getMobilityProfile(context);

  const ranges = {
    1: { start: 0, count: profile.wave1Count, expiresSec: 15 },
    2: { start: profile.wave1Count, count: profile.wave2Count, expiresSec: 15 },
    3: {
      start: profile.wave1Count + profile.wave2Count,
      count: profile.wave3Count,
      expiresSec: 20,
    },
  } as const;

  const wave = ranges[waveNumber];
  const selected = scoredDrivers.slice(wave.start, wave.start + wave.count);

  return { selected, expiresSec: wave.expiresSec };
}

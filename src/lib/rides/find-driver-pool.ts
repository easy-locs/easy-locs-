/**
 * Find Driver Pool — Iterates ride type fallbacks × radius steps to locate a valid driver pool.
 */
import { selectCandidateDrivers, type CandidateDriver } from "@/lib/rides/select-candidate-drivers";
import { DEFAULT_RADIUS_STEPS } from "@/lib/rides/radius-expansion";
import { getRideTypeFallbackChain, type RideType } from "@/lib/rides/ride-type-fallback";

export function findDriverPool(opts: {
  userLat: number;
  userLng: number;
  drivers: CandidateDriver[];
  requestedRideType: RideType;
}) {
  const { userLat, userLng, drivers, requestedRideType } = opts;
  const rideTypes = getRideTypeFallbackChain(requestedRideType);

  for (const rideType of rideTypes) {
    for (let i = 0; i < DEFAULT_RADIUS_STEPS.length; i++) {
      const step = DEFAULT_RADIUS_STEPS[i];
      const pool = selectCandidateDrivers(
        userLat,
        userLng,
        drivers,
        step.radiusKm,
        step.maxDrivers,
        rideType,
      );

      if (pool.length > 0) {
        return {
          pool,
          radiusKm: step.radiusKm,
          rideTypeUsed: rideType,
          radiusStepIndex: i,
        };
      }
    }
  }

  return {
    pool: [] as CandidateDriver[],
    radiusKm: null as number | null,
    rideTypeUsed: requestedRideType,
    radiusStepIndex: -1,
  };
}

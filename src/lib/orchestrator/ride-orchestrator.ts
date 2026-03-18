/**
 * Ride Orchestrator — Full ride lifecycle: pool discovery → price → wave dispatch → thread.
 */
import { computeRadar } from "@/lib/radar/radar-engine";
import { computeSurge, calculateFare, getFareRules, isNightHour, type FareEstimate } from "@/lib/fare-engine";
import { runWaveDispatch, type DispatchResult } from "@/lib/rides/retry-ride-request";
import { findDriverPool } from "@/lib/rides/find-driver-pool";
import { insertRideSystemMessage } from "@/lib/orbit/insert-ride-system-message";
import { supabase } from "@/integrations/supabase/client";

export interface RideFlowResult {
  rideRequestId: string;
  fare: FareEstimate;
  surge: number;
  nearbyCount: number;
  assigned: boolean;
  driverId: string | null;
  threadId: string | null;
  radiusKm: number | null;
  rideTypeUsed: string;
}

export async function startRideFlow(opts: {
  userId: string;
  userLat: number;
  userLng: number;
  drivers: Array<{ id: string; lat: number; lng: number; status: "available" | "busy"; type: "taxi" | "delivery"; rating: number; acceptance_rate?: number; vehicle_class?: "eco" | "standard" | "premium" }>;
  distanceKm: number;
  durationMin: number;
  countryCode?: string;
  requestedRideType?: "eco" | "standard" | "premium";
}): Promise<RideFlowResult> {
  const {
    userId, userLat, userLng, drivers, distanceKm, durationMin, countryCode,
    requestedRideType = "standard",
  } = opts;

  // 1. Pool discovery with radius expansion + ride type fallback
  const poolResult = findDriverPool({ userLat, userLng, drivers, requestedRideType });

  if (!poolResult.pool.length) {
    throw new Error("No drivers nearby");
  }

  // 2. Radar stats for surge
  const radar = computeRadar(userLat, userLng, poolResult.pool, poolResult.radiusKm ?? 10, "taxi");
  const rankedDrivers = poolResult.pool.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

  // 3. Pricing
  const surge = computeSurge(radar.totalCount, radar.availableCount);
  const rules = getFareRules(countryCode);
  const fare = calculateFare({
    distanceKm, durationMin, rules,
    isNight: isNightHour(),
    surgeFactor: surge,
  });

  // 4. Create ride request
  const { data: rideRequest, error: rideError } = await supabase
    .from("ride_requests" as any)
    .insert({
      rider_id: userId,
      status: "searching",
      pickup_lat: userLat,
      pickup_lng: userLng,
      offered_driver_ids: rankedDrivers.map((d) => d.id),
      requested_ride_type: requestedRideType,
      assigned_ride_type: poolResult.rideTypeUsed,
      search_radius_km: poolResult.radiusKm,
    } as any)
    .select("*")
    .single();

  if (rideError || !rideRequest) {
    throw rideError ?? new Error("Failed to create ride request");
  }

  // 5. Insert offers
  await supabase.from("ride_offers" as any).insert(
    rankedDrivers.map((d) => ({
      ride_request_id: (rideRequest as any).id,
      driver_id: d.id,
      score: d.score,
      offer_status: "pending",
    })) as any,
  );

  // 6. Wave dispatch
  const dispatch: DispatchResult = await runWaveDispatch({
    rideRequestId: (rideRequest as any).id,
    rankedDrivers,
    pickupLat: userLat,
    pickupLng: userLng,
  });

  // 7. Thread + system message
  let threadId: string | null = null;
  if (dispatch.assigned && dispatch.driverId) {
    try {
      const { data } = await supabase
        .from("conversation_threads" as any)
        .insert({
          initiator_id: userId,
          context_type: "ride",
          context_id: (rideRequest as any).id,
          participant_ids: [userId, dispatch.driverId],
        } as any)
        .select("id")
        .single();
      threadId = (data as any)?.id ?? null;

      if (threadId) {
        await insertRideSystemMessage({
          threadId,
          rideRequestId: (rideRequest as any).id,
          driverId: dispatch.driverId,
          etaMin: rankedDrivers.find((d) => d.id === dispatch.driverId)?.eta ?? null,
        });
      }
    } catch {
      // Thread creation is non-blocking
    }
  }

  return {
    rideRequestId: (rideRequest as any).id,
    fare,
    surge,
    nearbyCount: radar.availableCount,
    assigned: !!dispatch.assigned,
    driverId: dispatch.driverId ?? null,
    threadId,
    radiusKm: poolResult.radiusKm,
    rideTypeUsed: poolResult.rideTypeUsed,
  };
}

/** Build in-thread action cards for ride context */
export function buildRideActions(threadId: string) {
  return [
    { label: "📍 Track driver", route: `/track/${threadId}`, type: "track" as const },
    { label: "📞 Call driver", route: `/call/${threadId}`, type: "call" as const },
    { label: "💳 Pay ride", route: `/wallet/pay/${threadId}`, type: "pay" as const },
  ];
}

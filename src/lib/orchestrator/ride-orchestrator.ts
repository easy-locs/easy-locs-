/**
 * Ride Orchestrator — Full ride lifecycle: radar → rank → price → wave dispatch → thread.
 * Single entry point for the ride flow with progressive driver matching.
 */
import { computeRadar, type DriverWithDistance } from "@/lib/radar/radar-engine";
import { computeSurge, calculateFare, getFareRules, isNightHour, type FareEstimate } from "@/lib/fare-engine";
import { runWaveDispatch, type DispatchResult } from "@/lib/rides/retry-ride-request";
import { supabase } from "@/integrations/supabase/client";

export interface RideFlowResult {
  rideRequestId: string;
  fare: FareEstimate;
  surge: number;
  nearbyCount: number;
  assigned: boolean;
  driverId: string | null;
  threadId: string | null;
}

export async function startRideFlow(opts: {
  userId: string;
  userLat: number;
  userLng: number;
  drivers: Array<{ id: string; lat: number; lng: number; status: "available" | "busy"; type: "taxi" | "delivery"; rating: number; acceptance_rate?: number }>;
  distanceKm: number;
  durationMin: number;
  countryCode?: string;
}): Promise<RideFlowResult> {
  const { userId, userLat, userLng, drivers, distanceKm, durationMin, countryCode } = opts;

  // 1. Radar
  const radar = computeRadar(userLat, userLng, drivers, 10, "taxi");
  if (!radar.nearbyDrivers.length) {
    throw new Error("No drivers nearby");
  }

  // 2. Rank drivers with composite score
  const rankedDrivers = radar.nearbyDrivers
    .map((d) => {
      const distanceScore = 1 / Math.max(d.distance, 0.1);
      const ratingScore = (d.rating ?? 4) / 5;
      const acceptanceScore = (d as any).acceptance_rate ?? 0.85;
      return {
        ...d,
        score: distanceScore * 0.55 + ratingScore * 0.25 + acceptanceScore * 0.20,
      };
    })
    .sort((a, b) => b.score - a.score);

  // 3. Pricing with demand/supply surge
  const surge = computeSurge(radar.totalCount, radar.availableCount);
  const rules = getFareRules(countryCode);
  const fare = calculateFare({
    distanceKm,
    durationMin,
    rules,
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
    } as any)
    .select("*")
    .single();

  if (rideError || !rideRequest) {
    throw rideError ?? new Error("Failed to create ride request");
  }

  // 5. Insert all offers
  await supabase.from("ride_offers" as any).insert(
    rankedDrivers.map((d) => ({
      ride_request_id: (rideRequest as any).id,
      driver_id: d.id,
      score: d.score,
      offer_status: "pending",
    })) as any,
  );

  // 6. Wave dispatch (progressive 3-3-4 with 4s timeout per wave)
  const dispatch: DispatchResult = await runWaveDispatch({
    rideRequestId: (rideRequest as any).id,
    rankedDrivers,
    pickupLat: userLat,
    pickupLng: userLng,
  });

  // 7. Create Orbit thread if assigned
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

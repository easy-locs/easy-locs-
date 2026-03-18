/**
 * Ride Orchestrator — Full ride lifecycle: pool discovery → AI ranking → dynamic pricing → wave dispatch → thread.
 */
import { computeRadar } from "@/lib/radar/radar-engine";
import { calculateFare, getFareRules, isNightHour, type FareEstimate } from "@/lib/fare-engine";
import { runWaveDispatch, type DispatchResult } from "@/lib/rides/retry-ride-request";
import { findDriverPool } from "@/lib/rides/find-driver-pool";
import { insertRideSystemMessage } from "@/lib/orbit/insert-ride-system-message";
import { rankDriversAI } from "@/lib/rides/rank-drivers-ai";
import { updateDemandZone } from "@/lib/rides/update-demand-zone";
import { computeAISurge } from "@/lib/rides/ai-surge";
import { toZoneKey } from "@/lib/geo/zone-utils";
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
  drivers: any[];
  distanceKm: number;
  durationMin: number;
  countryCode?: string;
  requestedRideType?: "eco" | "standard" | "premium";
  riderPriority?: "standard" | "priority" | "vip";
}): Promise<RideFlowResult> {
  const {
    userId, userLat, userLng, drivers, distanceKm, durationMin, countryCode,
    requestedRideType = "standard",
    riderPriority = "standard",
  } = opts;

  // 1. Pool discovery with radius expansion + ride type fallback
  const poolResult = findDriverPool({ userLat, userLng, drivers, requestedRideType });

  if (!poolResult.pool.length) {
    throw new Error("No drivers nearby");
  }

  // 2. AI-powered driver ranking
  const rankedDrivers = rankDriversAI({
    userLat,
    userLng,
    drivers: poolResult.pool as any,
    requestedRideType,
    riderPriority,
    radiusKm: poolResult.radiusKm ?? 10,
    maxDrivers: 10,
  });

  // 3. Demand zone update + AI surge pricing
  const zoneKey = toZoneKey(userLat, userLng, 2);

  const zoneUpdate = await updateDemandZone({
    lat: userLat,
    lng: userLng,
    activeRequests: Math.max(1, rankedDrivers.length - 1),
    activeDrivers: rankedDrivers.length,
  });

  const surge = computeAISurge({
    demand: Math.max(1, rankedDrivers.length - 1),
    supply: rankedDrivers.length,
    predictedDemand: zoneUpdate.predictedDemand,
    riderPriority,
    peakHour: (() => {
      const h = new Date().getHours();
      return (h >= 7 && h <= 9) || (h >= 17 && h <= 21);
    })(),
  });

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
      offered_driver_ids: rankedDrivers.map((d: any) => d.id),
      requested_ride_type: requestedRideType,
      assigned_ride_type: poolResult.rideTypeUsed,
      search_radius_km: poolResult.radiusKm,
      rider_priority: riderPriority,
      zone_key: zoneKey,
      ai_dispatch_version: "v1-ai-rank",
      predicted_wait_minutes: rankedDrivers[0]?.eta ?? null,
    } as any)
    .select("*")
    .single();

  if (rideError || !rideRequest) {
    throw rideError ?? new Error("Failed to create ride request");
  }

  // 5. Insert offers
  await supabase.from("ride_offers" as any).insert(
    rankedDrivers.map((d: any) => ({
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

  // 7. Thread + system message + push notification
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

      const assignedEta =
        rankedDrivers.find((d: any) => d.id === dispatch.driverId)?.eta ?? null;

      if (threadId) {
        await insertRideSystemMessage({
          threadId,
          rideRequestId: (rideRequest as any).id,
          driverId: dispatch.driverId,
          etaMin: assignedEta,
        });
      }

      const { error: assignUpdateError } = await supabase
        .from("ride_requests" as any)
        .update({
          thread_id: threadId,
          updated_at: new Date().toISOString(),
        } as any)
        .eq("id", (rideRequest as any).id);

      if (assignUpdateError) {
        console.error("[ride-orchestrator] failed to persist thread_id", assignUpdateError);
      }

      const { notifyRideAssigned } = await import("@/lib/notifications/ride-push");
      await notifyRideAssigned(userId, (rideRequest as any).id, assignedEta);
    } catch (e) {
      console.error("[ride-orchestrator] assignment side-effects failed", e);
    }
  }

  return {
    rideRequestId: (rideRequest as any).id,
    fare,
    surge,
    nearbyCount: rankedDrivers.length,
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

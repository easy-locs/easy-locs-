/**
 * Ride Orchestrator — Full ride lifecycle: radar → match → price → thread.
 * Single entry point for the ride flow.
 */
import { computeRadar, selectBestDriver, type DriverWithDistance } from "@/lib/radar/radar-engine";
import { computeSurge, calculateFare, getFareRules, isNightHour, type FareEstimate } from "@/lib/fare-engine";
import { supabase } from "@/integrations/supabase/client";

export interface RideFlowResult {
  driver: DriverWithDistance;
  fare: FareEstimate;
  surge: number;
  threadId: string | null;
  nearbyCount: number;
}

export async function startRideFlow(opts: {
  userId: string;
  userLat: number;
  userLng: number;
  drivers: Array<{ id: string; lat: number; lng: number; status: "available" | "busy"; type: "taxi" | "delivery"; rating: number }>;
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

  // 2. Best driver
  const driver = selectBestDriver(radar.nearbyDrivers);
  if (!driver) {
    throw new Error("No driver available");
  }

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

  // 4. Create Orbit thread
  let threadId: string | null = null;
  try {
    const { data } = await supabase
      .from("conversation_threads" as any)
      .insert({
        initiator_id: userId,
        context_type: "ride",
        context_id: driver.id,
      } as any)
      .select("id")
      .single();
    threadId = (data as any)?.id ?? null;
  } catch {
    // Thread creation is non-blocking
  }

  return { driver, fare, surge, threadId, nearbyCount: radar.availableCount };
}

/** Build in-thread action cards for ride context */
export function buildRideActions(threadId: string) {
  return [
    { label: "📍 Track driver", route: `/track/${threadId}`, type: "track" as const },
    { label: "📞 Call driver", route: `/call/${threadId}`, type: "call" as const },
    { label: "💳 Pay ride", route: `/wallet/pay/${threadId}`, type: "pay" as const },
  ];
}

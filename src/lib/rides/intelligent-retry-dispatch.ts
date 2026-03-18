/**
 * Intelligent Retry Dispatch — Re-rank drivers between waves based on rejection/timeout history.
 */
import { supabase } from "@/integrations/supabase/client";
import { buildDispatchWaves, sendWaveOffers } from "@/lib/rides/wave-dispatch";
import { reRankDrivers } from "@/lib/rides/re-rank-drivers";
import type { DispatchResult } from "@/lib/rides/retry-ride-request";

interface IntelligentDispatchInput {
  rideRequestId: string;
  pickupLat: number;
  pickupLng: number;
  rankedDrivers: Array<{ id: string; distance: number; rating: number; acceptance_rate?: number; score: number }>;
}

export async function runIntelligentRetryDispatch({
  rideRequestId,
  pickupLat,
  pickupLng,
  rankedDrivers,
}: IntelligentDispatchInput): Promise<DispatchResult> {
  let remainingDrivers = [...rankedDrivers];

  for (let cycle = 0; cycle < 3; cycle++) {
    const waves = buildDispatchWaves(remainingDrivers, [3, 3, 4], 4000);

    for (const wave of waves) {
      const { data: current } = await supabase
        .from("ride_requests" as any)
        .select("status")
        .eq("id", rideRequestId)
        .single();

      if (!current || (current as any).status !== "searching") {
        return { ok: true, stopped: true };
      }

      await sendWaveOffers(rideRequestId, wave, pickupLat, pickupLng);
      await new Promise((resolve) => setTimeout(resolve, wave.timeoutMs));

      const { data: afterWave } = await supabase
        .from("ride_requests" as any)
        .select("status, selected_driver_id")
        .eq("id", rideRequestId)
        .single();

      if ((afterWave as any)?.status === "assigned") {
        return {
          ok: true,
          assigned: true,
          driverId: (afterWave as any).selected_driver_id,
        };
      }

      // Re-rank remaining drivers based on offer outcomes
      const { data: offerRows } = await supabase
        .from("ride_offers" as any)
        .select("driver_id, offer_status")
        .eq("ride_request_id", rideRequestId);

      const rejectedSet = new Set(
        ((offerRows as any[]) || [])
          .filter((o) => o.offer_status === "rejected")
          .map((o) => o.driver_id),
      );

      const timeoutSet = new Set(
        ((offerRows as any[]) || [])
          .filter((o) => o.offer_status === "pending")
          .map((o) => o.driver_id),
      );

      remainingDrivers = reRankDrivers(
        remainingDrivers
          .filter((d) => !wave.driverIds.includes(d.id))
          .map((d) => ({
            ...d,
            recent_reject: rejectedSet.has(d.id),
            recent_timeout: timeoutSet.has(d.id),
          })),
      );
    }
  }

  // All cycles exhausted — expire
  await supabase
    .from("ride_requests" as any)
    .update({ status: "expired", updated_at: new Date().toISOString() } as any)
    .eq("id", rideRequestId)
    .eq("status", "searching");

  return { ok: false, expired: true };
}

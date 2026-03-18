/**
 * Retry Ride Request — Execute wave-based dispatch with progressive timeouts.
 * Iterates through waves, checking assignment status between each.
 */
import { supabase } from "@/integrations/supabase/client";
import { buildDispatchWaves, sendWaveOffers, type RankedDriver } from "@/lib/rides/wave-dispatch";

interface RetryRideRequestInput {
  rideRequestId: string;
  rankedDrivers: RankedDriver[];
  pickupLat: number;
  pickupLng: number;
}

export interface DispatchResult {
  ok: boolean;
  assigned?: boolean;
  stopped?: boolean;
  expired?: boolean;
  driverId?: string | null;
}

export async function runWaveDispatch(input: RetryRideRequestInput): Promise<DispatchResult> {
  const { rideRequestId, rankedDrivers, pickupLat, pickupLng } = input;
  const waves = buildDispatchWaves(rankedDrivers, [3, 3, 4], 4000);

  for (const wave of waves) {
    // Check if ride is still searching before sending next wave
    const { data: current } = await supabase
      .from("ride_requests" as any)
      .select("status")
      .eq("id", rideRequestId)
      .single();

    if (!current || (current as any).status !== "searching") {
      return { ok: true, stopped: true };
    }

    await sendWaveOffers(rideRequestId, wave, pickupLat, pickupLng);

    // Wait for wave timeout
    await new Promise((resolve) => setTimeout(resolve, wave.timeoutMs));

    // Check if a driver accepted during this wave
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
  }

  // All waves exhausted — expire
  await supabase
    .from("ride_requests" as any)
    .update({ status: "expired", updated_at: new Date().toISOString() } as any)
    .eq("id", rideRequestId)
    .eq("status", "searching");

  await supabase
    .from("ride_offers" as any)
    .update({ offer_status: "expired", responded_at: new Date().toISOString() } as any)
    .eq("ride_request_id", rideRequestId)
    .eq("offer_status", "pending");

  return { ok: false, assigned: false, expired: true };
}

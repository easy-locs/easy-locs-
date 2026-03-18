/**
 * Wave Dispatch — Send ride offers in progressive waves to ranked drivers.
 * Wave 1: top 3 → wait 4s → Wave 2: next 3 → wait 4s → Wave 3: remaining.
 */
import { supabase } from "@/integrations/supabase/client";

export interface RankedDriver {
  id: string;
  score: number;
}

export interface DispatchWave {
  index: number;
  driverIds: string[];
  timeoutMs: number;
}

/** Split ranked drivers into progressive waves */
export function buildDispatchWaves(
  rankedDrivers: RankedDriver[],
  waveSizes = [3, 3, 4],
  timeoutMs = 4000,
): DispatchWave[] {
  const waves: DispatchWave[] = [];
  let cursor = 0;

  waveSizes.forEach((size, index) => {
    const slice = rankedDrivers.slice(cursor, cursor + size);
    if (!slice.length) return;

    waves.push({
      index,
      driverIds: slice.map((d) => d.id),
      timeoutMs,
    });

    cursor += size;
  });

  return waves;
}

/** Broadcast a single wave of offers to drivers */
export async function sendWaveOffers(
  rideRequestId: string,
  wave: DispatchWave,
  pickupLat: number,
  pickupLng: number,
) {
  const channel = supabase.channel("ride-broadcast");
  await channel.subscribe();

  for (const driverId of wave.driverIds) {
    await channel.send({
      type: "broadcast",
      event: "ride_request",
      payload: {
        ride_request_id: rideRequestId,
        driver_id: driverId,
        pickup_lat: pickupLat,
        pickup_lng: pickupLng,
        wave_index: wave.index,
      },
    });
  }

  supabase.removeChannel(channel);

  await supabase
    .from("ride_requests" as any)
    .update({ current_wave: wave.index, updated_at: new Date().toISOString() } as any)
    .eq("id", rideRequestId);
}

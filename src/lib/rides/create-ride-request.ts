/**
 * Create Ride Request — Insert ride_request + ride_offers + broadcast to drivers.
 */
import { supabase } from "@/integrations/supabase/client";
import { selectCandidateDrivers } from "./select-candidate-drivers";

interface CreateRideRequestInput {
  riderId: string;
  pickupLat: number;
  pickupLng: number;
  dropoffLat?: number;
  dropoffLng?: number;
  drivers: Array<{ id: string; lat: number; lng: number; status: "available" | "busy"; type: "taxi" | "delivery"; rating: number; acceptance_rate?: number }>;
}

export async function createRideRequest(input: CreateRideRequestInput) {
  const { riderId, pickupLat, pickupLng, dropoffLat, dropoffLng, drivers } = input;

  const candidates = selectCandidateDrivers(pickupLat, pickupLng, drivers, 7);
  if (!candidates.length) throw new Error("No drivers available nearby");

  const offeredDriverIds = candidates.map(d => d.id);

  // Insert ride request
  const { data: rideRequest, error: rideError } = await supabase
    .from("ride_requests" as any)
    .insert({
      rider_id: riderId,
      pickup_lat: pickupLat,
      pickup_lng: pickupLng,
      dropoff_lat: dropoffLat ?? null,
      dropoff_lng: dropoffLng ?? null,
      offered_driver_ids: offeredDriverIds,
      status: "searching",
    } as any)
    .select("*")
    .single();

  if (rideError || !rideRequest) throw rideError ?? new Error("Failed to create ride request");

  // Insert offers
  const offersPayload = candidates.map(driver => ({
    ride_request_id: (rideRequest as any).id,
    driver_id: driver.id,
    score: driver.score,
    offer_status: "pending",
  }));

  const { error: offersError } = await supabase
    .from("ride_offers" as any)
    .insert(offersPayload as any);

  if (offersError) throw offersError;

  // Broadcast to each candidate driver
  const channel = supabase.channel("ride-broadcast");
  await channel.subscribe();
  for (const driver of candidates) {
    await channel.send({
      type: "broadcast",
      event: "ride_request",
      payload: {
        ride_request_id: (rideRequest as any).id,
        driver_id: driver.id,
        pickup_lat: pickupLat,
        pickup_lng: pickupLng,
      },
    });
  }
  supabase.removeChannel(channel);

  return { rideRequest: rideRequest as any, candidates };
}

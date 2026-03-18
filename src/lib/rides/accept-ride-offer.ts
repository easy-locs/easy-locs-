/**
 * Accept Ride Offer — Atomic first-driver-wins via RPC.
 */
import { supabase } from "@/integrations/supabase/client";

export async function acceptRideOffer(
  rideRequestId: string,
  driverId: string,
): Promise<{ ok: boolean; error?: string; ride_request_id?: string; driver_id?: string }> {
  const { data, error } = await supabase.rpc("accept_ride_offer" as any, {
    p_ride_request_id: rideRequestId,
    p_driver_id: driverId,
  });

  if (error) throw error;
  return data as any;
}

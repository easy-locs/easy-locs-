/**
 * Ride Lifecycle RPCs — Driver-side actions for ride state transitions.
 */
import { supabase } from "@/integrations/supabase/client";

export async function markDriverArrived(rideRequestId: string, driverId: string) {
  const { data, error } = await supabase.rpc("ride_mark_arrived" as any, {
    p_ride_request_id: rideRequestId,
    p_driver_id: driverId,
  });
  if (error) throw error;
  return data;
}

export async function confirmRidePickup(rideRequestId: string, driverId: string) {
  const { data, error } = await supabase.rpc("ride_confirm_pickup" as any, {
    p_ride_request_id: rideRequestId,
    p_driver_id: driverId,
  });
  if (error) throw error;
  return data;
}

export async function completeRide(
  rideRequestId: string,
  driverId: string,
  finalAmount: number,
) {
  const { data, error } = await supabase.rpc("ride_complete" as any, {
    p_ride_request_id: rideRequestId,
    p_driver_id: driverId,
    p_final_amount: finalAmount,
  });
  if (error) throw error;
  return data;
}

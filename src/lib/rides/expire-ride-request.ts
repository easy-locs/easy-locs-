/**
 * Expire Ride Request — Mark timed-out requests and their pending offers.
 */
import { supabase } from "@/integrations/supabase/client";

export async function expireRideRequest(rideRequestId: string) {
  const { error } = await supabase
    .from("ride_requests" as any)
    .update({ status: "expired", updated_at: new Date().toISOString() } as any)
    .eq("id", rideRequestId)
    .eq("status", "searching");

  if (error) throw error;

  await supabase
    .from("ride_offers" as any)
    .update({ offer_status: "expired", responded_at: new Date().toISOString() } as any)
    .eq("ride_request_id", rideRequestId)
    .eq("offer_status", "pending");
}

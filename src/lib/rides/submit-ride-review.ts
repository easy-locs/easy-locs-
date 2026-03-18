/**
 * submitRideReview — Save rider rating, review, and optionally settle tip.
 */
import { supabase } from "@/integrations/supabase/client";
import { settleRideTip } from "@/lib/wallet/settle-ride-tip";
import { notifyTipReceived } from "@/lib/notifications/ride-push";

export async function submitRideReview(params: {
  rideRequestId: string;
  riderId: string;
  driverId: string;
  rating: number;
  review?: string;
  tipAmount?: number;
  threadId?: string | null;
}) {
  const {
    rideRequestId,
    riderId,
    driverId,
    rating,
    review,
    tipAmount = 0,
    threadId,
  } = params;

  const { error } = await supabase
    .from("ride_requests" as any)
    .update({
      rider_rating: rating,
      rider_review: review ?? null,
      updated_at: new Date().toISOString(),
    } as any)
    .eq("id", rideRequestId);

  if (error) throw error;

  if (tipAmount > 0) {
    await settleRideTip({
      rideRequestId,
      riderId,
      driverId,
      tipAmount,
      threadId,
    });

    await notifyTipReceived(driverId, rideRequestId, tipAmount);
  }

  return { ok: true };
}

/**
 * ride-push — Push notification helpers for ride lifecycle events.
 */
import { supabase } from "@/integrations/supabase/client";

async function createRideNotification(params: {
  userId: string;
  title: string;
  message: string;
  link: string;
  rideRequestId: string;
  level: "info" | "success" | "warning";
}) {
  await supabase.from("notifications" as any).insert({
    user_id: params.userId,
    title: params.title,
    message: params.message,
    type: "ride",
    link: params.link,
    metadata_json: {
      ride_request_id: params.rideRequestId,
      level: params.level,
    },
  } as any);
}

export async function notifyRideAssigned(
  riderUserId: string,
  rideRequestId: string,
  etaMin?: number | null,
) {
  await createRideNotification({
    userId: riderUserId,
    title: "Driver found",
    message: etaMin != null
      ? `Your driver is arriving in about ${etaMin} min`
      : "Your ride has been assigned",
    link: `/track/${rideRequestId}`,
    rideRequestId,
    level: "success",
  });
}

export async function notifyRideArrived(
  riderUserId: string,
  rideRequestId: string,
) {
  await createRideNotification({
    userId: riderUserId,
    title: "Driver arrived",
    message: "Your driver has arrived at pickup",
    link: `/track/${rideRequestId}`,
    rideRequestId,
    level: "info",
  });
}

export async function notifyRideStarted(
  riderUserId: string,
  rideRequestId: string,
) {
  await createRideNotification({
    userId: riderUserId,
    title: "Trip started",
    message: "Your ride is now in progress",
    link: `/track/${rideRequestId}`,
    rideRequestId,
    level: "info",
  });
}

export async function notifyRideCompleted(
  riderUserId: string,
  rideRequestId: string,
  amount: number,
) {
  await createRideNotification({
    userId: riderUserId,
    title: "Trip completed",
    message: `Your ride is complete · ${amount.toFixed(2)} AED`,
    link: `/ride/receipt/${rideRequestId}`,
    rideRequestId,
    level: "success",
  });
}

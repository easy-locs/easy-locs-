/**
 * Dispatch Live Tracking — Driver location publishing and delivery milestone updates.
 * Feeds driver_live_locations and updates dispatch/order status.
 */
import { supabase } from "@/integrations/supabase/client";
import { platformBus } from "@/lib/shared/platform-bus";

// ── 1. Publish driver location ────────────────────────────
export async function publishDriverLocation(params: {
  driverProfileId: string;
  dispatchJobId?: string;
  orderId?: string;
  lat: number;
  lng: number;
  heading?: number;
  speedKmh?: number;
  accuracyM?: number;
}) {
  // Verify driver is assigned to this job if jobId provided
  if (params.dispatchJobId) {
    const { data: job } = await (supabase as any)
      .from("dispatch_jobs_v2")
      .select("assigned_driver_id")
      .eq("id", params.dispatchJobId)
      .single();

    // Only assigned driver can publish for this job
    if (job && job.assigned_driver_id !== params.driverProfileId) {
      throw new Error("Only the assigned driver can publish tracking for this job");
    }
  }

  // Insert location point
  await (supabase as any).from("driver_live_locations").insert({
    driver_profile_id: params.driverProfileId,
    dispatch_job_id: params.dispatchJobId ?? null,
    order_id: params.orderId ?? null,
    lat: params.lat,
    lng: params.lng,
    heading: params.heading ?? null,
    speed_kmh: params.speedKmh ?? null,
    accuracy_m: params.accuracyM ?? null,
  });

  // Update driver profile live position
  await (supabase as any)
    .from("driver_profiles")
    .update({
      current_lat: params.lat,
      current_lng: params.lng,
      heading: params.heading ?? null,
      last_location_at: new Date().toISOString(),
    } as any)
    .eq("id", params.driverProfileId);

  // Emit tracking event
  platformBus.emit("tracking:position_updated", {
    driverProfileId: params.driverProfileId,
    dispatchJobId: params.dispatchJobId,
    lat: params.lat,
    lng: params.lng,
  }, "tracking");

  return { ok: true };
}

// ── 2. Get latest tracking for dispatch ───────────────────
export async function getLatestTrackingForDispatch(dispatchJobId: string) {
  const { data } = await (supabase as any)
    .from("driver_live_locations")
    .select("*")
    .eq("dispatch_job_id", dispatchJobId)
    .order("recorded_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return null;

  // Get job for ETA estimate
  const { data: job } = await (supabase as any)
    .from("dispatch_jobs_v2")
    .select("dropoff_lat, dropoff_lng, dispatch_status")
    .eq("id", dispatchJobId)
    .single();

  let etaMinutes: number | null = null;
  if (job?.dropoff_lat && job?.dropoff_lng && data.lat && data.lng) {
    const R = 6371;
    const dLat = ((job.dropoff_lat - data.lat) * Math.PI) / 180;
    const dLng = ((job.dropoff_lng - data.lng) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 +
      Math.cos((data.lat * Math.PI) / 180) * Math.cos((job.dropoff_lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
    const distKm = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    etaMinutes = Math.max(1, Math.ceil((distKm / 30) * 60));
  }

  return {
    lat: data.lat,
    lng: data.lng,
    heading: data.heading,
    speedKmh: data.speed_kmh,
    recordedAt: data.recorded_at,
    dispatchStatus: job?.dispatch_status,
    etaMinutes,
  };
}

// ── 3. Update delivery milestone ──────────────────────────
export type DeliveryMilestone =
  | "driver_arriving_pickup"
  | "picked_up"
  | "in_progress"
  | "delivered";

const MILESTONE_EVENTS: Record<DeliveryMilestone, string> = {
  driver_arriving_pickup: "delivery:pickup_arrived",
  picked_up: "delivery:picked_up",
  in_progress: "delivery:in_progress",
  delivered: "delivery:delivered",
};

export async function updateDeliveryMilestone(params: {
  dispatchJobId: string;
  orderId: string;
  milestone: DeliveryMilestone;
}) {
  const now = new Date().toISOString();

  // Update dispatch job
  const jobPatch: Record<string, any> = { dispatch_status: params.milestone, updated_at: now };
  if (params.milestone === "picked_up") jobPatch.picked_up_at = now;
  if (params.milestone === "delivered") jobPatch.delivered_at = now;

  await (supabase as any)
    .from("dispatch_jobs_v2")
    .update(jobPatch as any)
    .eq("id", params.dispatchJobId);

  // Map milestone to order delivery_status
  const orderStatusMap: Record<DeliveryMilestone, string> = {
    driver_arriving_pickup: "arriving_pickup",
    picked_up: "picked_up",
    in_progress: "in_progress",
    delivered: "delivered_unvalidated",
  };

  await (supabase as any)
    .from("orders")
    .update({ delivery_status: orderStatusMap[params.milestone] } as any)
    .eq("id", params.orderId);

  // Emit Orbit event
  const eventType = MILESTONE_EVENTS[params.milestone];
  if (eventType) {
    platformBus.emit(eventType as any, {
      dispatchJobId: params.dispatchJobId,
      orderId: params.orderId,
      milestone: params.milestone,
    }, "tracking");
  }

  return { ok: true };
}

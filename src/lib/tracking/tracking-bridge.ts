/**
 * Tracking bridge — connects mobility_jobs to live tracking sessions.
 * Canonical: reads mobility_jobs only.
 */
import { supabase } from "@/integrations/supabase/client";
import { getOrCreateTrackingSession } from "@/lib/tracking/live-tracking";

export async function startTrackingForMobilityJob(jobId: string) {
  const { data: job, error } = await (supabase as any)
    .from("mobility_jobs")
    .select("*")
    .eq("id", jobId)
    .single();

  if (error) throw error;

  return getOrCreateTrackingSession({
    contextType: "mobility_job",
    contextId: job.id,
    driverId: job.rider_profile_id ?? undefined,
    customerUserId: job.customer_user_id ?? undefined,
    merchantProfileId: job.merchant_id ?? undefined,
  });
}

/** @deprecated Use startTrackingForMobilityJob instead */
export const startTrackingForDispatchJob = startTrackingForMobilityJob;

export async function startTrackingForOrder(orderId: string) {
  const { data: order, error } = await (supabase as any)
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .single();

  if (error) throw error;

  // Find linked mobility_job if any
  const { data: linkedJob } = await (supabase as any)
    .from("mobility_jobs")
    .select("rider_user_id, rider_profile_id")
    .eq("order_id", orderId)
    .maybeSingle();

  return getOrCreateTrackingSession({
    contextType: "order",
    contextId: order.id,
    driverId: linkedJob?.rider_profile_id ?? undefined,
    customerUserId: order.customer_user_id,
    merchantProfileId: order.merchant_profile_id ?? undefined,
  });
}

import { supabase } from "@/integrations/supabase/client";
import { getOrCreateTrackingSession } from "@/lib/tracking/live-tracking";

export async function startTrackingForDispatchJob(dispatchJobId: string) {
  const { data: job, error } = await (supabase as any)
    .from("dispatch_jobs_v2")
    .select("*")
    .eq("id", dispatchJobId)
    .single();

  if (error) throw error;

  let driverProfileId: string | null = null;
  if (job.assigned_driver_id) {
    // assigned_driver_id in v2 is already a driver_profile_id
    driverProfileId = job.assigned_driver_id;
  }

  return getOrCreateTrackingSession({
    contextType: "dispatch_job",
    contextId: job.id,
    driverId: driverProfileId ?? undefined,
    customerUserId: job.customer_user_id ?? undefined,
    merchantProfileId: job.merchant_profile_id ?? undefined,
  });
}

export async function startTrackingForOrder(orderId: string) {
  const { data: order, error } = await (supabase as any)
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .single();

  if (error) throw error;

  let driverProfileId: string | null = null;
  if (order.assigned_driver_user_id) {
    const { data: dp } = await (supabase as any)
      .from("driver_profiles")
      .select("id")
      .eq("user_id", order.assigned_driver_user_id)
      .maybeSingle();
    driverProfileId = dp?.id ?? null;
  }

  return getOrCreateTrackingSession({
    contextType: "order",
    contextId: order.id,
    driverId: driverProfileId ?? undefined,
    customerUserId: order.customer_user_id,
    merchantProfileId: order.merchant_profile_id ?? undefined,
  });
}

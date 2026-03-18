/**
 * Driver earnings — calculate earnings from completed orders and dispatch jobs.
 */
import { supabase } from "@/integrations/supabase/client";

export interface DriverEarningsSummary {
  totalEarned: number;
  completedJobs: number;
  avgPerJob: number;
  currency: string;
}

export async function getDriverEarnings(driverUserId: string): Promise<DriverEarningsSummary> {
  // From completed orders
  const { data: orders } = await (supabase as any)
    .from("orders")
    .select("total_amount, delivery_fee, currency")
    .eq("assigned_driver_user_id", driverUserId)
    .eq("status", "completed");

  // From completed dispatch jobs
  const { data: jobs } = await (supabase as any)
    .from("dispatch_jobs")
    .select("final_fee, quoted_fee, currency")
    .eq("assigned_driver_id", driverUserId)
    .eq("status", "delivered");

  const orderEarnings = (orders ?? []).reduce(
    (sum: number, o: any) => sum + Number(o.delivery_fee || 0),
    0
  );

  const jobEarnings = (jobs ?? []).reduce(
    (sum: number, j: any) => sum + Number(j.final_fee || j.quoted_fee || 0),
    0
  );

  const total = orderEarnings + jobEarnings;
  const count = (orders?.length ?? 0) + (jobs?.length ?? 0);

  return {
    totalEarned: Number(total.toFixed(2)),
    completedJobs: count,
    avgPerJob: count > 0 ? Number((total / count).toFixed(2)) : 0,
    currency: orders?.[0]?.currency || jobs?.[0]?.currency || "AED",
  };
}

/**
 * Driver earnings — calculate earnings from completed mobility_jobs.
 * Canonical: reads mobility_jobs only.
 */
import { db } from "@/services/db";

export interface DriverEarningsSummary {
  totalEarned: number;
  completedJobs: number;
  avgPerJob: number;
  currency: string;
}

export async function getDriverEarnings(driverUserId: string): Promise<DriverEarningsSummary> {
  const { data: jobs } = await db
    .from("mobility_jobs")
    .select("current_price, quoted_price, currency")
    .eq("rider_user_id", driverUserId)
    .eq("status", "completed");

  const earnings = (jobs ?? []).reduce(
    (sum: number, j: any) => sum + Number(j.current_price || j.quoted_price || 0),
    0
  );

  const count = jobs?.length ?? 0;

  return {
    totalEarned: Number(earnings.toFixed(2)),
    completedJobs: count,
    avgPerJob: count > 0 ? Number((earnings / count).toFixed(2)) : 0,
    currency: jobs?.[0]?.currency || "AED",
  };
}

/**
 * Delivery Monitor Engine — Tracks active mobility jobs, detects stuck jobs.
 * CANONICAL: reads from mobility_jobs only.
 */
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;
const STUCK_THRESHOLD_MIN = 45;

export async function runDeliveryMonitor(limit = 100) {
  const cutoff = new Date(Date.now() - STUCK_THRESHOLD_MIN * 60_000).toISOString();

  const { data: active } = await db
    .from("mobility_jobs")
    .select("id, status, rider_user_id, created_at, accepted_at")
    .in("status", ["accepted", "rider_arriving_pickup", "rider_arrived_pickup", "picked_up", "in_progress"])
    .limit(limit);

  let stuck = 0, alerts = 0;
  for (const job of active ?? []) {
    const refTime = job.accepted_at ?? job.created_at;
    if (refTime && refTime < cutoff) {
      stuck++;
      await db.from("admin_alerts").insert({
        alert_type: "stuck_delivery",
        severity: "high",
        status: "open",
        title: `Mobility job stuck: ${job.id.slice(0, 8)}`,
        body: `Job ${job.id} has been in ${job.status} for over ${STUCK_THRESHOLD_MIN}min`,
        entity_type: "mobility_job",
        entity_id: job.id,
      });
      alerts++;
    }
  }

  const { count: unassigned } = await db
    .from("mobility_jobs")
    .select("id", { count: "exact", head: true })
    .eq("status", "searching")
    .is("rider_user_id", null);

  return { activeJobs: active?.length ?? 0, stuck, alerts, unassigned: unassigned ?? 0 };
}

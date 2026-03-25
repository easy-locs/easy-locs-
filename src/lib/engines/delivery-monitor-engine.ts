/**
 * Delivery Monitor Engine — Tracks active deliveries, detects stuck jobs, auto-alerts.
 */
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;
const STUCK_THRESHOLD_MIN = 45;

export async function runDeliveryMonitor(limit = 100) {
  const cutoff = new Date(Date.now() - STUCK_THRESHOLD_MIN * 60_000).toISOString();

  // Active delivery jobs
  const { data: active } = await db
    .from("delivery_jobs")
    .select("id, status, driver_id, created_at, assigned_at")
    .in("status", ["assigned", "accepted", "in_progress"])
    .limit(limit);

  let stuck = 0, alerts = 0;
  for (const job of active ?? []) {
    const refTime = job.assigned_at ?? job.created_at;
    if (refTime && refTime < cutoff) {
      stuck++;
      // Create admin alert for stuck delivery
      await db.from("admin_alerts").insert({
        alert_type: "stuck_delivery",
        severity: "high",
        status: "open",
        title: `Delivery stuck: ${job.id.slice(0, 8)}`,
        body: `Job ${job.id} has been in ${job.status} for over ${STUCK_THRESHOLD_MIN}min`,
        entity_type: "delivery_job",
        entity_id: job.id,
      });
      alerts++;
    }
  }

  // Unassigned jobs needing drivers
  const { count: unassigned } = await db
    .from("delivery_jobs")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending")
    .is("driver_id", null);

  return { activeJobs: active?.length ?? 0, stuck, alerts, unassigned: unassigned ?? 0 };
}

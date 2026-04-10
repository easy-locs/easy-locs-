/**
 * dispatch-expiry-cron — Expires timed-out offers and escalates to next wave.
 */
import { supabase } from "@/integrations/supabase/client";
import { processDispatchTimeouts } from "./dispatch-reassign-engine";

export async function runDispatchExpiryCron() {
  const nowIso = new Date().toISOString();

  const { data: expiredOffers } = await supabase
    .from("mobility_job_offers")
    .select("id,job_id,status")
    .eq("status", "pending")
    .lt("expires_at", nowIso)
    .limit(100);

  if (!expiredOffers?.length) return;

  const jobIds = [...new Set(expiredOffers.map((o: any) => o.job_id))];

  // Expire the offers
  await supabase
    .from("mobility_job_offers")
    .update({
      status: "expired",
      responded_at: nowIso,
    } as any)
    .in(
      "id",
      expiredOffers.map((o: any) => o.id),
    );

  // Process each job for wave escalation
  for (const jobId of jobIds) {
    const { data: scores } = await supabase
      .from("mobility_driver_scores")
      .select("rider_user_id,rank_index,score_total")
      .eq("job_id", jobId)
      .order("rank_index", { ascending: true });

    await processDispatchTimeouts(
      jobId,
      (scores ?? []).map((s: any) => ({
        rider_user_id: s.rider_user_id,
        rank_index: s.rank_index,
        score_total: Number(s.score_total),
        distance_km: 0,
        score_distance: 0,
        score_acceptance: 0,
        score_response: 0,
        score_reliability: 0,
        score_zone: 0,
        score_activity: 0,
        score_vehicle_fit: 0,
        score_gps_quality: 0,
        explanation_json: {},
      })),
    );
  }
}

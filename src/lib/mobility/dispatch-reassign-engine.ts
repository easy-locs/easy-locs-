/**
 * dispatch-reassign-engine — Handles wave timeouts, escalation, and failure.
 */
import { supabase } from "@/integrations/supabase/client";
import { dispatchWave } from "./dispatch-wave-engine";
import type { ScoredDriver } from "./driver-ai-scorer";

export async function processDispatchTimeouts(jobId: string, scoredDrivers: ScoredDriver[]) {
  const { data: run } = await supabase
    .from("mobility_dispatch_runs")
    .select("*")
    .eq("job_id", jobId)
    .maybeSingle();

  if (!run || (run as any).status !== "running") return;

  // Check if already accepted
  const { data: acceptedOffer } = await supabase
    .from("mobility_job_offers")
    .select("id")
    .eq("job_id", jobId)
    .eq("status", "accepted")
    .limit(1)
    .maybeSingle();

  if (acceptedOffer) {
    await supabase
      .from("mobility_dispatch_runs")
      .update({ status: "assigned", updated_at: new Date().toISOString() } as any)
      .eq("id", (run as any).id);
    return;
  }

  const currentWave = (run as any).current_wave as number;
  const maxWaves = (run as any).max_waves as number;

  // All waves exhausted
  if (currentWave >= maxWaves) {
    await supabase
      .from("mobility_dispatch_runs")
      .update({ status: "failed", updated_at: new Date().toISOString() } as any)
      .eq("id", (run as any).id);

    await supabase
      .from("mobility_jobs")
      .update({ status: "failed_no_rider" } as any)
      .eq("id", jobId);

    return;
  }

  // Escalate to next wave
  const nextWave = Math.min(currentWave + 1, maxWaves) as 1 | 2 | 3;

  await supabase
    .from("mobility_dispatch_runs")
    .update({ current_wave: nextWave, updated_at: new Date().toISOString() } as any)
    .eq("id", (run as any).id);

  await dispatchWave(jobId, scoredDrivers, nextWave);
}

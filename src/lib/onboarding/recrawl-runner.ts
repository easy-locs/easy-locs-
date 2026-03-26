import { supabase } from "@/integrations/supabase/client";
import { runOnboardingPipeline } from "./onboarding-orchestrator";

export async function processQueuedRecrawls(limit = 10) {
  const db = supabase as any;
  const { data: jobs, error } = await db.from("onboarding_recrawl_jobs").select("*").eq("status", "queued").limit(limit);
  if (error) throw error;

  for (const job of jobs ?? []) {
    await db.from("onboarding_recrawl_jobs").update({ status: "running", started_at: new Date().toISOString() }).eq("id", job.id);
    try {
      const result = await runOnboardingPipeline(job.input_json);
      await db.from("onboarding_recrawl_jobs").update({ status: "completed", finished_at: new Date().toISOString(), result_json: result }).eq("id", job.id);
    } catch (e: any) {
      await db.from("onboarding_recrawl_jobs").update({ status: "failed", finished_at: new Date().toISOString(), error_message: e?.message ?? "Unknown error" }).eq("id", job.id);
    }
  }
}

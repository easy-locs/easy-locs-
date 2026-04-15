import { db } from "@/services/db";
import { runPipeline } from "./pipeline/orchestrator";

export async function processQueuedRecrawls(limit = 10) {
  
  const { data: jobs, error } = await db("onboarding_recrawl_jobs").select("*").eq("status", "queued").limit(limit);
  if (error) throw error;

  for (const job of jobs ?? []) {
    await db("onboarding_recrawl_jobs").update({ status: "running", started_at: new Date().toISOString() }).eq("id", job.id);
    try {
      const input = job.input_json;
      const result = await runPipeline({
        raw: input.query ?? input.website ?? input.name ?? "",
        vertical: input.vertical,
        city: input.city,
        district: input.district,
        country: input.country,
        phone: input.phone,
        persist: true,
      });
      await db("onboarding_recrawl_jobs").update({ status: "completed", finished_at: new Date().toISOString(), result_json: result }).eq("id", job.id);
    } catch (e: any) {
      await db("onboarding_recrawl_jobs").update({ status: "failed", finished_at: new Date().toISOString(), error_message: e?.message ?? "Unknown error" }).eq("id", job.id);
    }
  }
}

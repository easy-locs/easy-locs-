/**
 * Dispatch retry engine — re-broadcast failed/expired jobs via canonical dispatch_jobs_v2.
 */
import { supabase } from "@/integrations/supabase/client";

const MAX_RETRIES = 3;

export async function retryDispatchJob(jobId: string): Promise<any> {
  const { data: job, error } = await (supabase as any)
    .from("dispatch_jobs_v2")
    .select("*")
    .eq("id", jobId)
    .single();

  if (error) throw error;
  if (!job) throw new Error("Job not found");

  const retryCount = job.retry_count ?? 0;

  if (retryCount >= MAX_RETRIES) {
    const { data, error: updateError } = await (supabase as any)
      .from("dispatch_jobs_v2")
      .update({ dispatch_status: "failed" } as any)
      .eq("id", jobId)
      .select("*")
      .single();
    if (updateError) throw updateError;
    return data;
  }

  const { data: updated, error: updateError } = await (supabase as any)
    .from("dispatch_jobs_v2")
    .update({
      dispatch_status: "open",
      assigned_driver_id: null,
      assigned_driver_wallet_id: null,
      retry_count: retryCount + 1,
      updated_at: new Date().toISOString(),
    } as any)
    .eq("id", jobId)
    .select("*")
    .single();

  if (updateError) throw updateError;
  return updated;
}

export async function getRetryableJobs() {
  const { data, error } = await (supabase as any)
    .from("dispatch_jobs_v2")
    .select("*")
    .in("dispatch_status", ["failed", "open", "expired"])
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) throw error;
  return data ?? [];
}

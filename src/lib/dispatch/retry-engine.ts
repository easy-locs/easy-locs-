/**
 * Dispatch retry engine — re-broadcast failed/expired jobs with configurable retry logic.
 */
import { supabase } from "@/integrations/supabase/client";

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 30_000; // 30 seconds

export async function retryDispatchJob(jobId: string): Promise<any> {
  const { data: job, error } = await (supabase as any)
    .from("dispatch_jobs")
    .select("*")
    .eq("id", jobId)
    .single();

  if (error) throw error;
  if (!job) throw new Error("Job not found");

  // Check retry count from metadata
  const metadata = (job.metadata as any) ?? {};
  const retryCount = metadata.retry_count ?? 0;

  if (retryCount >= MAX_RETRIES) {
    // Mark as failed after max retries
    const { data, error: updateError } = await (supabase as any)
      .from("dispatch_jobs")
      .update({ status: "failed" })
      .eq("id", jobId)
      .select("*")
      .single();
    if (updateError) throw updateError;
    return data;
  }

  // Reset to broadcast status for re-matching
  const { data: updated, error: updateError } = await (supabase as any)
    .from("dispatch_jobs")
    .update({
      status: "broadcast",
      assigned_driver_id: null,
      final_fee: null,
    })
    .eq("id", jobId)
    .select("*")
    .single();

  if (updateError) throw updateError;
  return updated;
}

export async function getRetryableJobs(workspaceId?: string) {
  let query = (supabase as any)
    .from("dispatch_jobs")
    .select("*")
    .in("status", ["failed", "open"])
    .order("created_at", { ascending: false })
    .limit(50);

  if (workspaceId) {
    query = query.eq("workspace_id", workspaceId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

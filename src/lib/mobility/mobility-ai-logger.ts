/**
 * mobility-ai-logger — Persists AI dispatch decisions to mobility_ai_logs.
 */
import { supabase } from "@/integrations/supabase/client";

export async function logMobilityAI(params: {
  jobId?: string | null;
  logType: string;
  logLevel?: "info" | "warn" | "error";
  message: string;
  metadata?: Record<string, any>;
}) {
  await supabase.from("mobility_ai_logs").insert({
    job_id: params.jobId ?? null,
    log_type: params.logType,
    log_level: params.logLevel ?? "info",
    message: params.message,
    metadata_json: params.metadata ?? {},
  } as any);
}

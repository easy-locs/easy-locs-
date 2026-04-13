/**
 * mobility-ai-logger — Persists AI dispatch decisions to mobility_ai_logs.
 */
import { db } from "@/services/db";

export async function logMobilityAI(params: {
  jobId?: string | null;
  logType: string;
  logLevel?: "info" | "warn" | "error";
  message: string;
  metadata?: Record<string, unknown>;
}) {
  await db("mobility_ai_logs").insert({
    job_id: params.jobId ?? null,
    log_type: params.logType,
    log_level: params.logLevel ?? "info",
    message: params.message,
    metadata_json: params.metadata ?? {},
  });
}

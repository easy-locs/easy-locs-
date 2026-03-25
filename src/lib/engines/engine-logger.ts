/**
 * Engine Logger — Persists every engine run to engine_run_logs table.
 * Replaces console-only logging with real DB persistence.
 */
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

export interface EngineRunResult {
  logId: string;
  engineName: string;
  category: string;
  durationMs: number;
  status: "ok" | "error";
  effectSummary: string;
  dbRowsAffected: number;
  errorMessage?: string;
}

export async function logEngineRun(params: {
  engineName: string;
  category: string;
  fn: () => Promise<{ summary: string; rowsAffected: number; metadata?: Record<string, any> }>;
}): Promise<EngineRunResult> {
  const logId = crypto.randomUUID();
  const startedAt = new Date().toISOString();
  const start = Date.now();

  // Insert "running" record
  await db.from("engine_run_logs").insert({
    id: logId,
    engine_name: params.engineName,
    category: params.category,
    started_at: startedAt,
    status: "running",
  }).catch(() => {});

  try {
    const result = await params.fn();
    const durationMs = Date.now() - start;

    await db.from("engine_run_logs").update({
      finished_at: new Date().toISOString(),
      duration_ms: durationMs,
      status: "ok",
      effect_summary: result.summary,
      db_rows_affected: result.rowsAffected,
      metadata_json: result.metadata ?? {},
    }).eq("id", logId).catch(() => {});

    return {
      logId,
      engineName: params.engineName,
      category: params.category,
      durationMs,
      status: "ok",
      effectSummary: result.summary,
      dbRowsAffected: result.rowsAffected,
    };
  } catch (e: any) {
    const durationMs = Date.now() - start;
    const errorMessage = e?.message ?? "unknown";

    await db.from("engine_run_logs").update({
      finished_at: new Date().toISOString(),
      duration_ms: durationMs,
      status: "error",
      error_message: errorMessage,
    }).eq("id", logId).catch(() => {});

    return {
      logId,
      engineName: params.engineName,
      category: params.category,
      durationMs,
      status: "error",
      effectSummary: "",
      dbRowsAffected: 0,
      errorMessage,
    };
  }
}

/** Get latest run per engine */
export async function getLatestEngineRuns(limit = 100) {
  const { data } = await db
    .from("engine_run_logs")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

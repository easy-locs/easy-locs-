/**
 * Backend Engine Status — Single source of truth for engine state.
 * Queries engine_supervisor table directly. Used by orchestrator engines.
 * For React components, use useBackendEngineStatus hook instead.
 */
import { supabase } from "@/integrations/supabase/client";
import { ENGINE_METADATA, type BusinessFunction, type EngineTier, type EngineVertical } from "./engine-metadata-registry";

const db = supabase as any;

type EngineCategory = "system" | "digital" | "quality" | "data" | "commerce" | "finance" | "delivery" | "lifecycle";

export type EngineJobStatus = {
  name: string;
  category: EngineCategory;
  intervalMs: number;
  intervalLabel: string;
  lastRun: string | null;
  runCount: number;
  lastStatus: "ok" | "idle" | "warning" | "error" | "pending";
  lastDetail: string | null;
  itemsProcessed: number;
  rowsAffected: number;
  businessImpact: string;
  summary: string;
};

function inferCategory(name: string, businessFn: BusinessFunction): EngineCategory {
  if (businessFn === "finance") return "finance";
  if (businessFn === "delivery") return "delivery";
  if (businessFn === "lifecycle") return "lifecycle";
  if (businessFn === "conversion") return "commerce";
  if (businessFn === "infrastructure") return "system";
  if (/import|ingestion|pipeline|source|taxonomy|classifier|category-mapping/i.test(name)) return "data";
  if (/banner|content|experience|social-proof|ux-audit|visual/i.test(name)) return "digital";
  return "quality";
}

function normalizeStatus(s: string | null | undefined): EngineJobStatus["lastStatus"] {
  if (s === "ok" || s === "idle" || s === "warning" || s === "error" || s === "pending") return s;
  if (s === "running") return "pending";
  return "pending";
}

/** Fetch engine status from backend (non-React, for orchestrators) */
export async function fetchBackendEngineStatus() {
  const { data: rows } = await db
    .from("engine_supervisor")
    .select("engine_name, status, enabled, last_run_at, last_error_message, last_duration_ms")
    .order("engine_name");

  if (!rows) return { running: false, totalJobs: 0, categories: {} as Record<EngineCategory, number>, jobs: [] as EngineJobStatus[] };

  const jobs: EngineJobStatus[] = (rows as any[]).map((row) => {
    const meta = ENGINE_METADATA[row.engine_name] ?? {
      tier: "standard" as EngineTier,
      businessFn: "infrastructure" as BusinessFunction,
      vertical: "all" as EngineVertical,
      canRunIdle: true,
      tablesWritten: [],
      fieldsWritten: [],
      description: "",
    };

    return {
      name: row.engine_name,
      category: inferCategory(row.engine_name, meta.businessFn),
      intervalMs: 0,
      intervalLabel: "server",
      lastRun: row.last_run_at,
      runCount: 0,
      lastStatus: normalizeStatus(row.status),
      lastDetail: row.last_error_message ?? (row.last_duration_ms != null ? `${row.last_duration_ms}ms` : null),
      itemsProcessed: 0,
      rowsAffected: 0,
      businessImpact: "",
      summary: meta.description,
    };
  });

  const categories = jobs.reduce<Record<EngineCategory, number>>((acc, job) => {
    acc[job.category] = (acc[job.category] || 0) + 1;
    return acc;
  }, { system: 0, digital: 0, quality: 0, data: 0, commerce: 0, finance: 0, delivery: 0, lifecycle: 0 });

  return { running: jobs.length > 0, totalJobs: jobs.length, categories, jobs };
}

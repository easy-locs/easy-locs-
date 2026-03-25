import { useMemo } from "react";
import { useEngineDebugSnapshot } from "@/hooks/useEngineDebugSnapshot";
import {
  ENGINE_METADATA,
  type BusinessFunction,
  type EngineTier,
  type EngineVertical,
} from "@/lib/engines/engine-metadata-registry";

type EngineCategory = "system" | "digital" | "quality" | "data" | "commerce" | "finance" | "delivery" | "lifecycle";
type EngineRuntimeStatus = "ok" | "idle" | "warning" | "error" | "pending";

type BackendEngineJob = {
  name: string;
  category: EngineCategory;
  intervalMs: number;
  intervalLabel: string;
  lastRun: string | null;
  runCount: number;
  lastStatus: EngineRuntimeStatus;
  lastDetail: string | null;
  itemsProcessed: number;
  rowsAffected: number;
  businessImpact: string;
  summary: string;
  tier: EngineTier;
  businessFn: BusinessFunction;
  vertical: EngineVertical;
  enabled: boolean;
};

function normalizeStatus(status: string | null | undefined): EngineRuntimeStatus {
  switch (status) {
    case "ok":
    case "idle":
    case "warning":
    case "error":
    case "pending":
      return status;
    case "running":
      return "pending";
    default:
      return "pending";
  }
}

function inferCategory(name: string, businessFn: BusinessFunction): EngineCategory {
  if (businessFn === "finance") return "finance";
  if (businessFn === "delivery") return "delivery";
  if (businessFn === "lifecycle") return "lifecycle";
  if (businessFn === "conversion") return "commerce";
  if (businessFn === "infrastructure") return "system";

  if (/import|ingestion|pipeline|source|taxonomy|classifier|category-mapping/i.test(name)) {
    return "data";
  }

  if (/banner|content|experience|social-proof|ux-audit|visual/i.test(name)) {
    return "digital";
  }

  return "quality";
}

export function useBackendEngineStatus(pollMs = 8000) {
  const { rows, loading } = useEngineDebugSnapshot(pollMs);

  return useMemo(() => {
    const jobs: BackendEngineJob[] = rows.map((row) => {
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
        tier: meta.tier,
        businessFn: meta.businessFn,
        vertical: meta.vertical,
        enabled: row.enabled,
      };
    });

    const categories = jobs.reduce<Record<EngineCategory, number>>((acc, job) => {
      acc[job.category] += 1;
      return acc;
    }, {
      system: 0,
      digital: 0,
      quality: 0,
      data: 0,
      commerce: 0,
      finance: 0,
      delivery: 0,
      lifecycle: 0,
    });

    return {
      loading,
      running: jobs.length > 0,
      totalJobs: jobs.length,
      categories,
      jobs,
    };
  }, [loading, rows]);
}
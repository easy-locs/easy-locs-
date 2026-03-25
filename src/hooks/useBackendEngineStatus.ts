import { useEffect, useMemo, useState } from "react";
import { useEngineDebugSnapshot } from "@/hooks/useEngineDebugSnapshot";
import { supabase } from "@/integrations/supabase/client";
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

type EngineRunLogRow = {
  engine_name: string;
  status: string;
  duration_ms: number | null;
  effect_summary: string | null;
  db_rows_affected: number | null;
  started_at: string;
};

type EngineRunAggregate = {
  runCount: number;
  rowsAffected: number;
  lastDetail: string | null;
  lastRun: string | null;
  lastStatus: EngineRuntimeStatus;
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
  const [runAggregates, setRunAggregates] = useState<Record<string, EngineRunAggregate>>({});

  useEffect(() => {
    let cancelled = false;

    const fetchRuns = async () => {
      const { data } = await (supabase as any)
        .from("engine_run_logs")
        .select("engine_name, status, duration_ms, effect_summary, db_rows_affected, started_at")
        .order("started_at", { ascending: false })
        .limit(500);

      if (cancelled || !data) return;

      const grouped = (data as EngineRunLogRow[]).reduce<Record<string, EngineRunAggregate>>((acc, row) => {
        const status = normalizeStatus(row.status);

        if (!acc[row.engine_name]) {
          acc[row.engine_name] = {
            runCount: 0,
            rowsAffected: 0,
            lastDetail: row.effect_summary ?? (row.duration_ms != null ? `${row.duration_ms}ms` : null),
            lastRun: row.started_at,
            lastStatus: status,
          };
        }

        acc[row.engine_name].runCount += 1;
        acc[row.engine_name].rowsAffected += Number(row.db_rows_affected ?? 0);

        return acc;
      }, {});

      setRunAggregates(grouped);
    };

    void fetchRuns();
    const timer = setInterval(fetchRuns, pollMs);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [pollMs]);

  return useMemo(() => {
    const jobs: BackendEngineJob[] = rows.map((row) => {
      const aggregate = runAggregates[row.engine_name];
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
        lastRun: aggregate?.lastRun ?? row.last_run_at,
        runCount: aggregate?.runCount ?? 0,
        lastStatus: aggregate?.lastStatus ?? normalizeStatus(row.status),
        lastDetail:
          row.last_error_message ??
          aggregate?.lastDetail ??
          (row.last_duration_ms != null ? `${row.last_duration_ms}ms` : null),
        itemsProcessed: 0,
        rowsAffected: aggregate?.rowsAffected ?? 0,
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
  }, [loading, rows, runAggregates]);
}
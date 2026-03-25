import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface EngineSupervisorRow {
  engine_name: string;
  status: string;
  enabled: boolean;
  engine_tier: string | null;
  last_run_at: string | null;
  last_success_at: string | null;
  last_error_at: string | null;
  last_error_message: string | null;
  last_duration_ms: number | null;
  consecutive_failures: number;
  runtime_class: string | null;
}

export function useEngineDebugSnapshot(pollMs = 8000) {
  const [rows, setRows] = useState<EngineSupervisorRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const fetch = async () => {
      const { data } = await (supabase as any)
        .from("engine_supervisor")
        .select("engine_name, status, enabled, engine_tier, last_run_at, last_success_at, last_error_at, last_error_message, last_duration_ms, consecutive_failures, runtime_class")
        .order("engine_name");
      if (!cancelled && data) {
        setRows(data);
        setLoading(false);
      }
    };

    fetch();
    const timer = setInterval(fetch, pollMs);
    return () => { cancelled = true; clearInterval(timer); };
  }, [pollMs]);

  return { rows, loading };
}

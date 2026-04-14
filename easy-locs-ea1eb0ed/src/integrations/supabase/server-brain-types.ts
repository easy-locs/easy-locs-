import type { SupabaseClient } from "@supabase/supabase-js";

export interface ServerEventRow {
  id: string;
  event_type: string;
  payload: Record<string, unknown>;
  source_engine: string;
  status: string;
  level: "debug" | "info" | "warn" | "error" | "critical";
  created_at: string;
  processed_at: string | null;
}

export interface OmegaDecisionRow {
  id: string;
  decision_type: string;
  target_type: string | null;
  target_id: string | null;
  verdict: string;
  global_score: number;
  sub_scores: Record<string, number>;
  critical_blockers: string[];
  warnings: string[];
  next_actions: string[];
  engine_statuses: Record<string, string>;
  report_payload: Record<string, unknown>;
  created_at: string;
}

export async function fetchLatestDecision(
  supabase: SupabaseClient,
): Promise<OmegaDecisionRow | null> {
  const { data, error } = await supabase
    .from("omega_decisions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1);

  if (error || !data?.length) return null;
  return data[0] as unknown as OmegaDecisionRow;
}

export async function fetchRecentServerEvents(
  supabase: SupabaseClient,
  limit = 20,
): Promise<ServerEventRow[]> {
  const { data, error } = await supabase
    .from("server_events")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return data as unknown as ServerEventRow[];
}

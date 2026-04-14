import { supabase } from "@/integrations/supabase/client";

const FUNCTION_BASE = "command-center-api";

async function callEndpoint<T>(
  action: string,
  method: "GET" | "POST" = "GET",
  body?: Record<string, unknown>,
): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated");

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const url = `${supabaseUrl}/functions/v1/${FUNCTION_BASE}/${action}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${session.access_token}`,
    apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  };

  const res = await fetch(url, {
    method,
    headers,
    body: method === "POST" ? JSON.stringify(body ?? {}) : undefined,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `Command Center API error: ${res.status}`);
  }

  return res.json();
}

export interface ServerBrainStatus {
  overall_health: "healthy" | "degraded" | "critical";
  autonomy_systems: Record<string, unknown>[];
  agent_heartbeats: Record<string, unknown>[];
  circuit_breakers: Record<string, unknown>[];
  latest_omega_decision: {
    verdict: string;
    global_score: number;
    engine_statuses: Record<string, string>;
    created_at: string;
  } | null;
  recent_events: Record<string, unknown>[];
  open_incidents: number;
  open_circuit_breakers: number;
  stale_agents: number;
  timestamp: string;
}

export interface ServerAgent {
  agent_name: string;
  status: string;
  last_beat_at: string;
  restart_count: number;
  metadata: Record<string, unknown>;
}

export interface ServerBrainEvent {
  id: string;
  event_type: string;
  level: string;
  source_engine: string;
  payload: Record<string, unknown>;
  created_at: string;
}

export const commandCenterClient = {
  getStatus: () => callEndpoint<ServerBrainStatus>("status"),
  getAgents: () => callEndpoint<{ agents: ServerAgent[] }>("agents"),
  getEvents: (limit = 20) =>
    callEndpoint<{ events: ServerBrainEvent[] }>(`events?limit=${limit}`),
  getHistory: (limit = 20) =>
    callEndpoint<{
      audit_log: Record<string, unknown>[];
      recent_decisions: Record<string, unknown>[];
      pagination: { limit: number; offset: number; total: number | null };
      timestamp: string;
    }>(`history?limit=${limit}`),
  approveRepair: (repairId: string, approvedBy?: string) =>
    callEndpoint<{ success: boolean }>("approve-repair", "POST", {
      repair_id: repairId,
      approved_by: approvedBy,
    }),
  quarantineEngine: (engineName: string, reason?: string) =>
    callEndpoint<{ success: boolean }>("quarantine", "POST", {
      engine_name: engineName,
      reason,
    }),
  releaseEngine: (engineName: string, releasedBy?: string) =>
    callEndpoint<{ success: boolean }>("release", "POST", {
      engine_name: engineName,
      released_by: releasedBy,
    }),
};

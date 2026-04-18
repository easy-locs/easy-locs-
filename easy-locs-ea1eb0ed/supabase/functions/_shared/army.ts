// Shared helpers for the Army hierarchy edge functions.
import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2.57.2";
import { getCorsHeaders } from "./cors.ts";

export type Risk = "low" | "normal" | "high" | "critical";

export const ARMY_DOMAINS = ["product", "growth", "ops", "finance", "security", "data"] as const;

export function armyClient(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );
}

export function jsonResponse(req: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...getCorsHeaders(req) },
  });
}

export function preflight(req: Request): Response | null {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders(req) });
  }
  return null;
}

/** Hard gate: refuses any execution while the global kill switch is on. */
export async function assertNotKilled(supabase: SupabaseClient): Promise<void> {
  const { data, error } = await supabase
    .schema("army")
    .from("system_flags")
    .select("value")
    .eq("key", "army_kill_switch")
    .maybeSingle();
  if (error) throw new Error(`kill-switch read failed: ${error.message}`);
  if (data?.value?.active) throw new Error("army_kill_switch_active");
}

/** Returns true if `roleCode` has `permission` on `domain`. */
export async function hasPermission(
  supabase: SupabaseClient,
  roleCode: string,
  permission: string,
  domain: string | null,
): Promise<boolean> {
  const { data } = await supabase
    .schema("army")
    .from("agent_policies")
    .select("allowed, scope")
    .eq("role_code", roleCode)
    .eq("permission", permission);
  if (!data || data.length === 0) return false;
  const explicitDeny = data.some((r) => r.allowed === false);
  if (explicitDeny) return false;
  return data.some((r) =>
    r.scope === "global" || r.scope === "self" ||
    (r.scope === "own_domain" && domain !== null)
  );
}

export async function logIncident(
  supabase: SupabaseClient,
  args: {
    severity?: "info" | "warn" | "error" | "critical";
    kind: string;
    message: string;
    role?: string;
    taskId?: string;
    orderId?: string;
    agentId?: string;
    context?: Record<string, unknown>;
  },
): Promise<void> {
  await supabase.schema("army").from("incident_log").insert({
    severity: args.severity ?? "warn",
    kind: args.kind,
    message: args.message,
    source_role: args.role ?? null,
    source_agent: args.agentId ?? null,
    task_id: args.taskId ?? null,
    order_id: args.orderId ?? null,
    context: args.context ?? {},
  });
}

export async function logMessage(
  supabase: SupabaseClient,
  args: {
    orderId?: string;
    taskId?: string;
    fromRole?: string;
    toRole?: string;
    fromAgent?: string;
    toAgent?: string;
    kind: string;
    payload?: Record<string, unknown>;
  },
): Promise<void> {
  await supabase.schema("army").from("agent_messages").insert({
    order_id: args.orderId ?? null,
    task_id: args.taskId ?? null,
    from_role: args.fromRole ?? null,
    to_role: args.toRole ?? null,
    from_agent: args.fromAgent ?? null,
    to_agent: args.toAgent ?? null,
    kind: args.kind,
    payload: args.payload ?? {},
  });
}

export async function recordMetric(
  supabase: SupabaseClient,
  m: {
    agentId?: string;
    taskId?: string;
    roleCode?: string;
    domain?: string;
    outcome: "success" | "failure" | "timeout" | "rejected";
    latencyMs?: number;
    costEur?: number;
    costTokens?: number;
  },
): Promise<void> {
  await supabase.schema("army").from("agent_metrics").insert({
    agent_id: m.agentId ?? null,
    task_id: m.taskId ?? null,
    role_code: m.roleCode ?? null,
    domain: m.domain ?? null,
    outcome: m.outcome,
    latency_ms: m.latencyMs ?? null,
    cost_eur: m.costEur ?? null,
    cost_tokens: m.costTokens ?? null,
  });
}

/** Validates the 8 reproduction conditions via the SQL RPC. */
export async function canSpawn(
  supabase: SupabaseClient,
  args: { roleCode: string; domain: string; taskType: string; dedupKey?: string },
): Promise<{ ok: boolean; reason?: string }> {
  const { data, error } = await supabase.schema("army").rpc("can_spawn", {
    p_role_code: args.roleCode,
    p_domain: args.domain,
    p_task_type: args.taskType,
    p_dedup_key: args.dedupKey ?? null,
  });
  if (error) return { ok: false, reason: error.message };
  return data as { ok: boolean; reason?: string };
}
}

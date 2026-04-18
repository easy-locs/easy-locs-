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

/**
 * Resolve the caller's identity from the Authorization header.
 * Returns one of:
 *   - { kind: "service" }                — service role JWT (cron / internal)
 *   - { kind: "user", userId, supreme }  — authenticated end-user
 *   - { kind: "anonymous" }              — no/invalid token
 */
export async function identifyCaller(req: Request): Promise<
  | { kind: "service" }
  | { kind: "user"; userId: string; supreme: boolean }
  | { kind: "anonymous" }
> {
  const authHeader = req.headers.get("authorization") ?? "";
  if (!authHeader.toLowerCase().startsWith("bearer ")) return { kind: "anonymous" };
  const token = authHeader.slice(7).trim();
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (token && token === serviceKey) return { kind: "service" };

  const url = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? serviceKey;
  const userClient = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false },
  });
  const { data: u, error } = await userClient.auth.getUser();
  if (error || !u?.user?.id) return { kind: "anonymous" };

  let supreme = false;
  try {
    const { data: roles } = await userClient
      .from("user_roles" as never)
      .select("role")
      .eq("user_id", u.user.id);
    if (Array.isArray(roles)) {
      supreme = roles.some((r: { role?: string }) =>
        ["super_admin", "supreme_commander", "admin"].includes((r.role ?? "")));
    }
  } catch (_) { /* table may not exist */ }
  if (!supreme) {
    try {
      const { data: prof } = await userClient
        .from("profiles" as never)
        .select("is_super_admin")
        .eq("id", u.user.id)
        .maybeSingle();
      if (prof && (prof as { is_super_admin?: boolean }).is_super_admin) supreme = true;
    } catch (_) { /* column may not exist */ }
  }
  return { kind: "user", userId: u.user.id, supreme };
}

/** Allow service role OR authenticated Supreme Commander. */
export async function requireSupreme(req: Request): Promise<Response | null> {
  const id = await identifyCaller(req);
  if (id.kind === "service") return null;
  if (id.kind === "user" && id.supreme) return null;
  return jsonResponse(req, { error: "forbidden_supreme_required" }, 403);
}

/** Allow service role OR any authenticated user. */
export async function requireAuthenticated(req: Request): Promise<Response | null> {
  const id = await identifyCaller(req);
  if (id.kind === "service" || id.kind === "user") return null;
  return jsonResponse(req, { error: "unauthorized" }, 401);
}

/**
 * Strictest gate for internal pipeline endpoints. Only the service role
 * (cron / army-tick) and Supreme Commander may call.
 */
export async function identifyCaller(req: Request): Promise<
  | { kind: "service" }
  | { kind: "user"; userId: string; supreme: boolean }
  | { kind: "anonymous" }
> {
  const authHeader = req.headers.get("authorization") ?? "";
  if (!authHeader.toLowerCase().startsWith("bearer ")) return { kind: "anonymous" };
  const token = authHeader.slice(7).trim();
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (token && token === serviceKey) return { kind: "service" };

  const url = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? serviceKey;
  const userClient = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false },
  });
  const { data: u, error } = await userClient.auth.getUser();
  if (error || !u?.user?.id) return { kind: "anonymous" };

  // Probe known role tables (tolerant — different conventions in this repo).
  let supreme = false;
  try {
    const { data: roles } = await userClient
      .from("user_roles" as never)
      .select("role")
      .eq("user_id", u.user.id);
    if (Array.isArray(roles)) {
      supreme = roles.some((r: { role?: string }) =>
        ["super_admin", "supreme_commander", "admin"].includes((r.role ?? "")));
    }
  } catch (_) { /* table may not exist */ }
  if (!supreme) {
    try {
      const { data: prof } = await userClient
        .from("profiles" as never)
        .select("is_super_admin")
        .eq("id", u.user.id)
        .maybeSingle();
      if (prof && (prof as { is_super_admin?: boolean }).is_super_admin) supreme = true;
    } catch (_) { /* column may not exist */ }
  }
  return { kind: "user", userId: u.user.id, supreme };
}

/** Allow service role OR authenticated Supreme Commander. Reject everything else. */
export async function requireSupreme(req: Request): Promise<Response | null> {
  const id = await identifyCaller(req);
  if (id.kind === "service") return null;
  if (id.kind === "user" && id.supreme) return null;
  return jsonResponse(req, { error: "forbidden_supreme_required" }, 403);
}

=======
>>>>>>> 2c86558f9d (Task #998 — Hierarchical agent army (Command Center + Supabase))
>>>>>>> ec7185642b (Task #998 — Hierarchical agent army (Command Center + Supabase))
=======
/** Allow service role OR any authenticated user. */
export async function requireAuthenticated(req: Request): Promise<Response | null> {
  const id = await identifyCaller(req);
  if (id.kind === "service" || id.kind === "user") return null;
  return jsonResponse(req, { error: "unauthorized" }, 401);
}

=======
>>>>>>> afb959b7f2 (Task #998 — Hierarchical agent army (Command Center + Supabase))
/**
 * Strictest gate for internal pipeline endpoints. Only the service role
 * (cron / army-tick) and Supreme Commander may call. Plain authenticated
 * users — even of the host app — are rejected because these endpoints
 * progress the chain and write incidents on behalf of the system.
 */
export async function requireServiceOrSupreme(req: Request): Promise<Response | null> {
  const id = await identifyCaller(req);
  if (id.kind === "service") return null;
  if (id.kind === "user" && id.supreme) return null;
  return jsonResponse(req, { error: "forbidden_internal_pipeline" }, 403);
}

>>>>>>> 1d3768c1a2 (Task #1010 — clean stale conflict markers in 6 supabase edge function files (post-rebase))
=======
>>>>>>> afb959b7f2 (Task #998 — Hierarchical agent army (Command Center + Supabase))
=======
>>>>>>> 6befb4644f (Task #998 — Hierarchical agent army (Command Center + Supabase))
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

/**
 * THE single spawn primitive. agent-spawn and agent-heal MUST funnel
 * through this; no other code path is allowed to insert into
 * army.agent_instances. Validates kill switch + the 8 reproduction
 * conditions before insert. TTL is mandatory (1..120 minutes).
 */
export async function spawnAgent(
  supabase: SupabaseClient,
  args: {
    roleCode: string;
    domain: string;
    taskType: string;
    ttlMinutes?: number;
    dedupKey?: string;
    parentId?: string;
    reason?: string;
    metadata?: Record<string, unknown>;
  },
): Promise<{ ok: true; agent: Record<string, unknown> } | { ok: false; reason: string }> {
  await assertNotKilled(supabase);
  const check = await canSpawn(supabase, args);
  if (!check.ok) {
    await logIncident(supabase, {
      severity: "warn", kind: "policy_violation", role: args.roleCode,
      message: `spawn rejected: ${check.reason}`,
      context: { domain: args.domain, type: args.taskType, dedup_key: args.dedupKey ?? null },
    });
    return { ok: false, reason: check.reason ?? "unknown" };
  }
  const ttl = new Date(
    Date.now() + Math.min(Math.max(args.ttlMinutes ?? 15, 1), 120) * 60_000,
  ).toISOString();
  const { data, error } = await supabase.schema("army").from("agent_instances")
    .insert({
      role_code: args.roleCode, domain: args.domain,
      parent_id: args.parentId ?? null,
      status: "active", ttl_at: ttl, spawn_reason: args.reason ?? "spawn",
      metadata: { ...(args.metadata ?? {}), dedup_key: args.dedupKey ?? null },
    }).select().single();
  if (error) return { ok: false, reason: error.message };
  return { ok: true, agent: data };
}

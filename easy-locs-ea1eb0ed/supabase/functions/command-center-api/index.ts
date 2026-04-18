import { requireRouterOrigin } from "../_shared/edge-function-consolidation.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { requireAuthenticatedUser } from "../_shared/edge-auth.ts";
import { rejectQuerySecrets } from "../_shared/reject-query-secrets.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-trace-id, x-span-id, x-parent-span-id, x-request-id, traceparent",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const VALID_ACTIONS = [
  "status",
  "approve-repair",
  "quarantine",
  "release",
  "history",
  "agents",
  "events",
] as const;

type Action = (typeof VALID_ACTIONS)[number];

async function requireAdmin(
  supabase: ReturnType<typeof createClient>,
  userId: string,
): Promise<{ isAdmin: boolean; response?: Response }> {
  if (userId === "service_role") return { isAdmin: true };

  const { data } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", userId)
    .maybeSingle();

  if (!data?.is_admin) {
    return {
      isAdmin: false,
      response: new Response(
        JSON.stringify({ error: "Admin privileges required" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      ),
    };
  }

  return { isAdmin: true };
}

Deno.serve(async (req) => {
  const __qsCheck = rejectQuerySecrets(req); if (__qsCheck.rejected) return __qsCheck.response!;
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const routerCheck = requireRouterOrigin(req);
  if (!routerCheck.allowed) return routerCheck.response!;
  const auth = await requireAuthenticatedUser(req);
  if (!auth.authorized) return auth.response!;

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const url = new URL(req.url);
  let action: Action = "status";
  let requestBody: Record<string, unknown> = {};

  const pathParts = url.pathname.split("/").filter(Boolean);
  const lastSegment = pathParts[pathParts.length - 1] ?? "";

  if (lastSegment && lastSegment !== "command-center-api" &&
      VALID_ACTIONS.includes(lastSegment as Action)) {
    action = lastSegment as Action;
  }

  if (req.method === "POST") {
    try {
      requestBody = await req.json();
    } catch { /* empty body */ }
  }

  const adminCheck = await requireAdmin(supabase, auth.userId!);
  if (!adminCheck.isAdmin) return adminCheck.response!;

  try {
    switch (action) {
      case "status":
        return await handleStatus(supabase);
      case "approve-repair":
        return await handleApproveRepair(supabase, requestBody);
      case "quarantine":
        return await handleQuarantine(supabase, requestBody);
      case "release":
        return await handleRelease(supabase, requestBody);
      case "history":
        return await handleHistory(supabase, url);
      case "agents":
        return await handleAgents(supabase);
      case "events":
        return await handleEvents(supabase, url);
      default:
        return jsonResponse(
          {
            error: "Unknown endpoint",
            available_endpoints: [...VALID_ACTIONS].map(
              (a) => `${req.method === "POST" ? "POST" : "GET"} /command-center-api/${a}`,
            ),
          },
          404,
        );
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[command-center-api] error:", msg);
    return jsonResponse({ error: msg }, 500);
  }
});

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function handleStatus(
  supabase: ReturnType<typeof createClient>,
): Promise<Response> {
  const { data: autonomySystems } = await supabase
    .from("autonomy_system_status")
    .select("*")
    .order("system_name");

  const { data: agentHeartbeats } = await supabase
    .from("agent_heartbeats")
    .select("*")
    .order("agent_name");

  const { data: circuitBreakers } = await supabase
    .from("agent_circuit_breakers")
    .select("*")
    .order("engine_name");

  const { data: latestDecision } = await supabase
    .from("omega_decisions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1);

  const { data: recentEvents } = await supabase
    .from("server_events")
    .select("id, event_type, source_engine, level, created_at")
    .order("created_at", { ascending: false })
    .limit(20);

  const { count: openIncidents } = await supabase
    .from("monitoring_findings")
    .select("id", { count: "exact", head: true })
    .eq("status", "open");

  const openBreakers = (circuitBreakers ?? []).filter(
    (cb) => cb.state === "open",
  );
  const staleAgents = (agentHeartbeats ?? []).filter(
    (a) => a.status !== "alive",
  );
  const redSystems = (autonomySystems ?? []).filter(
    (s) => s.status === "red",
  );

  let overallHealth: "healthy" | "degraded" | "critical" = "healthy";
  if (redSystems.length > 0 || openBreakers.length > 0) {
    overallHealth = "critical";
  } else if (staleAgents.length > 0 || (openIncidents ?? 0) > 5) {
    overallHealth = "degraded";
  }

  return jsonResponse({
    overall_health: overallHealth,
    autonomy_systems: autonomySystems ?? [],
    agent_heartbeats: agentHeartbeats ?? [],
    circuit_breakers: circuitBreakers ?? [],
    latest_omega_decision: latestDecision?.[0] ?? null,
    recent_events: recentEvents ?? [],
    open_incidents: openIncidents ?? 0,
    open_circuit_breakers: openBreakers.length,
    stale_agents: staleAgents.length,
    timestamp: new Date().toISOString(),
  });
}

async function handleApproveRepair(
  supabase: ReturnType<typeof createClient>,
  body: Record<string, unknown>,
): Promise<Response> {
  const { repair_id, approved_by } = body as { repair_id?: string; approved_by?: string };

  if (!repair_id) {
    return jsonResponse({ error: "repair_id is required" }, 400);
  }

  const { data: finding, error: findError } = await supabase
    .from("monitoring_findings")
    .select("*")
    .eq("id", repair_id)
    .maybeSingle();

  if (findError || !finding) {
    return jsonResponse(
      { error: "Repair/finding not found", repair_id },
      404,
    );
  }

  const { error: updateError } = await supabase
    .from("monitoring_findings")
    .update({
      status: "resolved",
      resolved_at: new Date().toISOString(),
    })
    .eq("id", repair_id);

  if (updateError) {
    return jsonResponse({ error: updateError.message }, 500);
  }

  await supabase.from("command_audit_log").insert({
    event_type: "repair_approved",
    actor_type: approved_by ? "human" : "system",
    actor_name: approved_by ?? "command-center-api",
    action: "approve_repair",
    target_type: "monitoring_finding",
    target_id: repair_id,
    details: { finding_title: finding.title, severity: finding.severity },
  });

  await supabase.rpc("emit_server_event", {
    p_event_type: "command:repair_approved",
    p_payload: {
      repair_id,
      title: finding.title,
      severity: finding.severity,
      approved_by: approved_by ?? "system",
    },
    p_source_engine: "command-center-api",
    p_level: "info",
  });

  return jsonResponse({
    success: true,
    repair_id,
    status: "resolved",
    message: `Repair approved for: ${finding.title}`,
  });
}

async function handleQuarantine(
  supabase: ReturnType<typeof createClient>,
  body: Record<string, unknown>,
): Promise<Response> {
  const { engine_name, reason, duration_minutes } = body as {
    engine_name?: string;
    reason?: string;
    duration_minutes?: number;
  };

  if (!engine_name) {
    return jsonResponse({ error: "engine_name is required" }, 400);
  }

  await supabase.from("agent_circuit_breakers").upsert(
    {
      engine_name,
      state: "open",
      quarantined_at: new Date().toISOString(),
      quarantine_reason: reason ?? "Manual quarantine via Command Center",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "engine_name" },
  );

  await supabase.from("command_audit_log").insert({
    event_type: "agent_quarantined",
    actor_type: "human",
    actor_name: "command-center-api",
    action: "quarantine_agent",
    target_type: "engine",
    target_id: engine_name,
    details: {
      reason: reason ?? "Manual quarantine",
      duration_minutes: duration_minutes ?? "indefinite",
    },
  });

  await supabase.rpc("emit_server_event", {
    p_event_type: "command:agent_quarantined",
    p_payload: {
      engine_name,
      reason: reason ?? "Manual quarantine",
    },
    p_source_engine: "command-center-api",
    p_level: "warn",
  });

  return jsonResponse({
    success: true,
    engine_name,
    state: "quarantined",
    reason: reason ?? "Manual quarantine",
    message: `Engine ${engine_name} has been quarantined`,
  });
}

async function handleRelease(
  supabase: ReturnType<typeof createClient>,
  body: Record<string, unknown>,
): Promise<Response> {
  const { engine_name, released_by } = body as {
    engine_name?: string;
    released_by?: string;
  };

  if (!engine_name) {
    return jsonResponse({ error: "engine_name is required" }, 400);
  }

  await supabase.rpc("record_circuit_breaker_success", {
    p_engine_name: engine_name,
  });

  await supabase.from("command_audit_log").insert({
    event_type: "agent_released",
    actor_type: released_by ? "human" : "system",
    actor_name: released_by ?? "command-center-api",
    action: "release_agent",
    target_type: "engine",
    target_id: engine_name,
    details: {},
  });

  await supabase.rpc("emit_server_event", {
    p_event_type: "command:agent_released",
    p_payload: { engine_name, released_by: released_by ?? "system" },
    p_source_engine: "command-center-api",
    p_level: "info",
  });

  return jsonResponse({
    success: true,
    engine_name,
    state: "closed",
    message: `Engine ${engine_name} has been released from quarantine`,
  });
}

async function handleHistory(
  supabase: ReturnType<typeof createClient>,
  url: URL,
): Promise<Response> {
  const limit = Math.min(
    parseInt(url.searchParams.get("limit") ?? "50"),
    200,
  );
  const offset = parseInt(url.searchParams.get("offset") ?? "0");
  const eventType = url.searchParams.get("event_type");

  let query = supabase
    .from("command_audit_log")
    .select("*")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (eventType) {
    query = query.eq("event_type", eventType);
  }

  const { data, error, count } = await query;

  if (error) {
    return jsonResponse({ error: error.message }, 500);
  }

  const { data: decisionHistory } = await supabase
    .from("omega_decisions")
    .select("id, decision_type, verdict, global_score, created_at")
    .order("created_at", { ascending: false })
    .limit(20);

  return jsonResponse({
    audit_log: data ?? [],
    recent_decisions: decisionHistory ?? [],
    pagination: { limit, offset, total: count },
    timestamp: new Date().toISOString(),
  });
}

async function handleAgents(
  supabase: ReturnType<typeof createClient>,
): Promise<Response> {
  const { data: heartbeats } = await supabase
    .from("agent_heartbeats")
    .select("*")
    .order("agent_name");

  const { data: circuitBreakers } = await supabase
    .from("agent_circuit_breakers")
    .select("*")
    .order("engine_name");

  const { data: supervisors } = await supabase
    .from("engine_supervisor")
    .select(
      "engine_name, status, last_run_at, consecutive_failures, engine_tier, runtime_class",
    )
    .order("engine_name");

  const cbMap = new Map(
    (circuitBreakers ?? []).map((cb) => [cb.engine_name, cb]),
  );
  const hbMap = new Map(
    (heartbeats ?? []).map((hb) => [hb.agent_name, hb]),
  );

  const agents = (supervisors ?? []).map((sv) => {
    const hb = hbMap.get(sv.engine_name);
    const cb = cbMap.get(sv.engine_name);
    const cbState = cb?.state ?? "closed";
    let status = hb?.status ?? "unknown";
    if (cbState === "open") status = "quarantined";

    return {
      agent_name: sv.engine_name,
      status,
      last_beat_at: hb?.last_beat_at ?? sv.last_run_at ?? null,
      restart_count: hb?.restart_count ?? 0,
      metadata: {
        tier: sv.engine_tier,
        runtime: sv.runtime_class,
        engine_status: sv.status,
        consecutive_failures: sv.consecutive_failures,
        circuit_breaker: cbState,
      },
    };
  });

  return jsonResponse({
    agents,
    total: agents.length,
    healthy: agents.filter((a) => a.status === "alive").length,
    degraded: agents.filter(
      (a) => a.status === "stale" || a.status === "restarting" || a.status === "unknown",
    ).length,
    quarantined: agents.filter((a) => a.status === "quarantined").length,
    dead: agents.filter((a) => a.status === "dead").length,
    timestamp: new Date().toISOString(),
  });
}

async function handleEvents(
  supabase: ReturnType<typeof createClient>,
  url: URL,
): Promise<Response> {
  const limit = Math.min(
    parseInt(url.searchParams.get("limit") ?? "50"),
    200,
  );
  const level = url.searchParams.get("level");
  const source = url.searchParams.get("source");

  let query = supabase
    .from("server_events")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (level) query = query.eq("level", level);
  if (source) query = query.eq("source_engine", source);

  const { data, error } = await query;

  if (error) {
    return jsonResponse({ error: error.message }, 500);
  }

  return jsonResponse({
    events: data ?? [],
    count: (data ?? []).length,
    filters: { level, source, limit },
    timestamp: new Date().toISOString(),
  });
}

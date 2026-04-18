import { requireRouterOrigin } from "../_shared/edge-function-consolidation.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { requireServiceRole } from "../_shared/edge-auth.ts";
import { rejectQuerySecrets } from "../_shared/reject-query-secrets.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-trace-id, x-span-id, x-parent-span-id, x-request-id, traceparent",
};

interface GuardResult {
  engine: string;
  status: "pass" | "fail" | "quarantined" | "error";
  checks_run: number;
  issues_found: number;
  details: Record<string, unknown>;
  duration_ms: number;
}

interface CircuitBreakerState {
  state: "closed" | "open" | "half_open";
  consecutive_failures: number;
}

const SENTINEL_GUARDS = [
  {
    id: "health-guard",
    name: "Health Engine",
    criticality: "critical" as const,
  },
  {
    id: "conflict-guard",
    name: "Conflict Engine",
    criticality: "critical" as const,
  },
  {
    id: "healing-guard",
    name: "Healing Engine",
    criticality: "critical" as const,
  },
  {
    id: "validation-guard",
    name: "Validation Engine",
    criticality: "critical" as const,
  },
  {
    id: "invariants-guard",
    name: "Invariants Engine",
    criticality: "critical" as const,
  },
];

async function getCircuitBreakerState(
  supabase: ReturnType<typeof createClient>,
  engineName: string,
): Promise<CircuitBreakerState> {
  const { data } = await supabase
    .from("agent_circuit_breakers")
    .select("state, consecutive_failures")
    .eq("engine_name", engineName)
    .maybeSingle();

  return data ?? { state: "closed", consecutive_failures: 0 };
}

async function runHealthGuard(
  supabase: ReturnType<typeof createClient>,
): Promise<GuardResult> {
  const start = Date.now();
  let checksRun = 0;
  let issuesFound = 0;
  const details: Record<string, unknown> = {};

  try {
    const { data: engines } = await supabase
      .from("engine_supervisor")
      .select(
        "engine_name, status, last_run_at, consecutive_failures, engine_tier",
      )
      .order("engine_name");

    checksRun++;
    const allEngines = engines ?? [];
    const healthyEngines = allEngines.filter((e) => e.status === "ok");
    const errorEngines = allEngines.filter((e) => e.status === "error");
    const staleEngines = allEngines.filter((e) => {
      if (!e.last_run_at) return false;
      const elapsed = Date.now() - new Date(e.last_run_at).getTime();
      return elapsed > 15 * 60 * 1000;
    });

    details["total_engines"] = allEngines.length;
    details["healthy"] = healthyEngines.length;
    details["error"] = errorEngines.length;
    details["stale"] = staleEngines.length;

    if (errorEngines.length > 0) {
      issuesFound += errorEngines.length;
      details["error_engines"] = errorEngines
        .slice(0, 10)
        .map((e) => e.engine_name);
    }

    if (staleEngines.length > 0) {
      issuesFound += staleEngines.length;
      details["stale_engines"] = staleEngines
        .slice(0, 10)
        .map((e) => e.engine_name);
    }

    const criticalErrors = errorEngines.filter(
      (e) => e.engine_tier === "critical",
    );
    if (criticalErrors.length > 0) {
      details["critical_errors"] = criticalErrors.map((e) => e.engine_name);
    }

    const { data: uptimeLog } = await supabase
      .from("system_uptime_log")
      .select("status, consecutive_failures")
      .order("created_at", { ascending: false })
      .limit(1);

    checksRun++;
    if (uptimeLog?.[0]) {
      details["system_status"] = uptimeLog[0].status;
      details["uptime_consecutive_failures"] =
        uptimeLog[0].consecutive_failures;
      if (uptimeLog[0].status !== "healthy") issuesFound++;
    }

    return {
      engine: "health-guard",
      status: issuesFound === 0 ? "pass" : "fail",
      checks_run: checksRun,
      issues_found: issuesFound,
      details,
      duration_ms: Date.now() - start,
    };
  } catch (e: unknown) {
    return {
      engine: "health-guard",
      status: "error",
      checks_run: checksRun,
      issues_found: 0,
      details: { error: e instanceof Error ? e.message : String(e) },
      duration_ms: Date.now() - start,
    };
  }
}

async function runConflictGuard(
  supabase: ReturnType<typeof createClient>,
): Promise<GuardResult> {
  const start = Date.now();
  let checksRun = 0;
  let issuesFound = 0;
  const details: Record<string, unknown> = {};

  try {
    const { data: duplicateEngines } = await supabase
      .from("engine_supervisor")
      .select("engine_name")
      .order("engine_name");

    checksRun++;
    const engineNames = (duplicateEngines ?? []).map((e) => e.engine_name);
    const duplicates = engineNames.filter(
      (name, idx) => engineNames.indexOf(name) !== idx,
    );
    if (duplicates.length > 0) {
      issuesFound += duplicates.length;
      details["duplicate_engines"] = duplicates;
    }

    const { data: openFindings } = await supabase
      .from("monitoring_findings")
      .select("id, category, severity, title")
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(50);

    checksRun++;
    const findings = openFindings ?? [];
    const categoryCounts: Record<string, number> = {};
    for (const f of findings) {
      categoryCounts[f.category] = (categoryCounts[f.category] ?? 0) + 1;
    }

    const conflictCategories = Object.entries(categoryCounts).filter(
      ([, count]) => count > 5,
    );
    if (conflictCategories.length > 0) {
      issuesFound += conflictCategories.length;
      details["conflict_hotspots"] = Object.fromEntries(conflictCategories);
    }

    details["open_findings_total"] = findings.length;
    details["categories_checked"] = Object.keys(categoryCounts).length;

    const { data: recentAuditLog } = await supabase
      .from("command_audit_log")
      .select("event_type, action")
      .gte(
        "created_at",
        new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      )
      .order("created_at", { ascending: false })
      .limit(100);

    checksRun++;
    const auditActions = recentAuditLog ?? [];
    const actionCounts: Record<string, number> = {};
    for (const a of auditActions) {
      actionCounts[a.action] = (actionCounts[a.action] ?? 0) + 1;
    }

    const stormActions = Object.entries(actionCounts).filter(
      ([, count]) => count > 20,
    );
    if (stormActions.length > 0) {
      issuesFound++;
      details["action_storms"] = Object.fromEntries(stormActions);
    }

    return {
      engine: "conflict-guard",
      status: issuesFound === 0 ? "pass" : "fail",
      checks_run: checksRun,
      issues_found: issuesFound,
      details,
      duration_ms: Date.now() - start,
    };
  } catch (e: unknown) {
    return {
      engine: "conflict-guard",
      status: "error",
      checks_run: checksRun,
      issues_found: 0,
      details: { error: e instanceof Error ? e.message : String(e) },
      duration_ms: Date.now() - start,
    };
  }
}

async function runHealingGuard(
  supabase: ReturnType<typeof createClient>,
): Promise<GuardResult> {
  const start = Date.now();
  let checksRun = 0;
  let issuesFound = 0;
  const details: Record<string, unknown> = {};

  try {
    const { data: failedEngines } = await supabase
      .from("engine_supervisor")
      .select("engine_name, status, consecutive_failures, last_error_message")
      .gt("consecutive_failures", 0)
      .order("consecutive_failures", { ascending: false })
      .limit(20);

    checksRun++;
    const healable = failedEngines ?? [];
    const needsAttention = healable.filter(
      (e) => e.consecutive_failures >= 1 && e.consecutive_failures < 5,
    );
    const beyondAutoRepair = healable.filter(
      (e) => e.consecutive_failures >= 5,
    );

    if (beyondAutoRepair.length > 0) {
      issuesFound += beyondAutoRepair.length;
    }

    if (needsAttention.length > 0) {
      await supabase.rpc("emit_server_event", {
        p_event_type: "sentinel:healing_candidates",
        p_payload: {
          candidates: needsAttention.map((e) => ({
            engine: e.engine_name,
            failures: e.consecutive_failures,
            last_error: e.last_error_message,
          })),
        },
        p_source_engine: "sentinel-healing-guard",
        p_level: "info",
      });
    }

    details["engines_needing_healing"] = healable.length;
    details["engines_candidate_for_healing"] = needsAttention.length;
    details["engines_beyond_repair"] = beyondAutoRepair.length;

    const { data: dlqItems } = await supabase
      .from("dead_letter_queue")
      .select("id, source_system, retry_count, max_retries")
      .in("status", ["pending", "retrying"])
      .order("created_at", { ascending: true })
      .limit(20);

    checksRun++;
    const dlqCount = dlqItems?.length ?? 0;
    details["dlq_pending"] = dlqCount;

    if (dlqCount > 10) {
      issuesFound++;
      details["dlq_warning"] = "High DLQ backlog";
    }

    return {
      engine: "healing-guard",
      status: issuesFound === 0 ? "pass" : "fail",
      checks_run: checksRun,
      issues_found: issuesFound,
      details,
      duration_ms: Date.now() - start,
    };
  } catch (e: unknown) {
    return {
      engine: "healing-guard",
      status: "error",
      checks_run: checksRun,
      issues_found: 0,
      details: { error: e instanceof Error ? e.message : String(e) },
      duration_ms: Date.now() - start,
    };
  }
}

async function runValidationGuard(
  supabase: ReturnType<typeof createClient>,
): Promise<GuardResult> {
  const start = Date.now();
  let checksRun = 0;
  let issuesFound = 0;
  const details: Record<string, unknown> = {};

  try {
    const { count: activeWallets } = await supabase
      .from("wallet_accounts")
      .select("id", { count: "exact", head: true })
      .eq("status", "active");

    checksRun++;
    details["active_wallets"] = activeWallets ?? 0;

    const { count: pendingJobs } = await supabase
      .from("job_queue")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending");

    checksRun++;
    details["pending_jobs"] = pendingJobs ?? 0;

    if ((pendingJobs ?? 0) > 100) {
      issuesFound++;
      details["job_queue_warning"] = "Job queue backlog exceeds threshold";
    }

    const { count: failedJobs } = await supabase
      .from("job_queue")
      .select("id", { count: "exact", head: true })
      .eq("status", "failed")
      .gte(
        "created_at",
        new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      );

    checksRun++;
    details["recent_failed_jobs"] = failedJobs ?? 0;
    if ((failedJobs ?? 0) > 10) {
      issuesFound++;
      details["failed_jobs_warning"] =
        "High number of recently failed jobs";
    }

    const { data: systemStatuses } = await supabase
      .from("autonomy_system_status")
      .select("system_name, status, last_run_at")
      .in("status", ["red", "yellow"]);

    checksRun++;
    const degradedSystems = systemStatuses ?? [];
    if (degradedSystems.length > 0) {
      issuesFound += degradedSystems.filter(
        (s) => s.status === "red",
      ).length;
      details["degraded_systems"] = degradedSystems.map(
        (s) => `${s.system_name}: ${s.status}`,
      );
    }

    return {
      engine: "validation-guard",
      status: issuesFound === 0 ? "pass" : "fail",
      checks_run: checksRun,
      issues_found: issuesFound,
      details,
      duration_ms: Date.now() - start,
    };
  } catch (e: unknown) {
    return {
      engine: "validation-guard",
      status: "error",
      checks_run: checksRun,
      issues_found: 0,
      details: { error: e instanceof Error ? e.message : String(e) },
      duration_ms: Date.now() - start,
    };
  }
}

async function runInvariantsGuard(
  supabase: ReturnType<typeof createClient>,
): Promise<GuardResult> {
  const start = Date.now();
  let checksRun = 0;
  let issuesFound = 0;
  const details: Record<string, unknown> = {};

  try {
    const { count: profileCount } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true });

    checksRun++;
    details["total_profiles"] = profileCount ?? 0;

    const { data: recentEvents } = await supabase
      .from("server_events")
      .select("id, event_type, level")
      .in("level", ["error", "critical"])
      .gte(
        "created_at",
        new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      )
      .order("created_at", { ascending: false })
      .limit(50);

    checksRun++;
    const errorEvents = recentEvents ?? [];
    details["recent_error_events"] = errorEvents.length;

    if (errorEvents.length > 10) {
      issuesFound++;
      details["error_event_warning"] =
        "High error event rate in last 30 minutes";
    }

    const criticalEvents = errorEvents.filter(
      (e) => e.level === "critical",
    );
    if (criticalEvents.length > 0) {
      issuesFound += criticalEvents.length;
      details["critical_events"] = criticalEvents.length;
    }

    const { data: circuitBreakers } = await supabase
      .from("agent_circuit_breakers")
      .select("engine_name, state, consecutive_failures")
      .eq("state", "open");

    checksRun++;
    const openBreakers = circuitBreakers ?? [];
    if (openBreakers.length > 0) {
      issuesFound += openBreakers.length;
      details["open_circuit_breakers"] = openBreakers.map(
        (b) => b.engine_name,
      );
    }

    const { data: agentStatuses } = await supabase
      .from("agent_heartbeats")
      .select("agent_name, status, last_beat_at")
      .in("status", ["stale", "dead"]);

    checksRun++;
    const deadAgents = agentStatuses ?? [];
    if (deadAgents.length > 0) {
      issuesFound += deadAgents.length;
      details["dead_agents"] = deadAgents.map((a) => a.agent_name);
    }

    return {
      engine: "invariants-guard",
      status: issuesFound === 0 ? "pass" : "fail",
      checks_run: checksRun,
      issues_found: issuesFound,
      details,
      duration_ms: Date.now() - start,
    };
  } catch (e: unknown) {
    return {
      engine: "invariants-guard",
      status: "error",
      checks_run: checksRun,
      issues_found: 0,
      details: { error: e instanceof Error ? e.message : String(e) },
      duration_ms: Date.now() - start,
    };
  }
}

const GUARD_RUNNERS: Record<
  string,
  (supabase: ReturnType<typeof createClient>) => Promise<GuardResult>
> = {
  "health-guard": runHealthGuard,
  "conflict-guard": runConflictGuard,
  "healing-guard": runHealingGuard,
  "validation-guard": runValidationGuard,
  "invariants-guard": runInvariantsGuard,
};

Deno.serve(async (req) => {
  const __qsCheck = rejectQuerySecrets(req); if (__qsCheck.rejected) return __qsCheck.response!;
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const routerCheck = requireRouterOrigin(req);
  if (!routerCheck.allowed) return routerCheck.response!;
  const auth = requireServiceRole(req);
  if (!auth.authorized) return auth.response!;

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const startTime = Date.now();

  let requestedGuards: string[] | null = null;
  try {
    const body = await req.json();
    if (body?.guard) requestedGuards = [body.guard];
    if (body?.guards && Array.isArray(body.guards))
      requestedGuards = body.guards;
  } catch {
    /* no body = run all */
  }

  const guardsToRun = requestedGuards
    ? SENTINEL_GUARDS.filter((g) => requestedGuards!.includes(g.id))
    : SENTINEL_GUARDS;

  await supabase.rpc("update_agent_heartbeat", {
    p_agent_name: "sentinel-server-guards",
    p_metadata: {
      guards_requested: guardsToRun.map((g) => g.id),
      started_at: new Date().toISOString(),
    },
  });

  const results: GuardResult[] = [];
  let totalPassed = 0;
  let totalFailed = 0;
  let totalQuarantined = 0;
  const incidents: string[] = [];

  for (const guard of guardsToRun) {
    const cbState = await getCircuitBreakerState(supabase, guard.id);

    if (cbState.state === "open") {
      results.push({
        engine: guard.id,
        status: "quarantined",
        checks_run: 0,
        issues_found: 0,
        details: {
          reason: "Circuit breaker open — engine quarantined",
          consecutive_failures: cbState.consecutive_failures,
        },
        duration_ms: 0,
      });
      totalQuarantined++;

      await supabase.rpc("emit_server_event", {
        p_event_type: `sentinel:guard_quarantined`,
        p_payload: {
          guard: guard.id,
          name: guard.name,
          consecutive_failures: cbState.consecutive_failures,
        },
        p_source_engine: "sentinel-server-guards",
        p_level: "warn",
      });

      continue;
    }

    const runner = GUARD_RUNNERS[guard.id];
    if (!runner) {
      results.push({
        engine: guard.id,
        status: "error",
        checks_run: 0,
        issues_found: 0,
        details: { error: "No runner implementation" },
        duration_ms: 0,
      });
      totalFailed++;
      continue;
    }

    try {
      const result = await runner(supabase);
      results.push(result);

      if (result.status === "pass") {
        totalPassed++;
        await supabase.rpc("record_circuit_breaker_success", {
          p_engine_name: guard.id,
        });
      } else if (result.status === "fail") {
        totalFailed++;
        if (guard.criticality === "critical" && result.issues_found > 0) {
          incidents.push(
            `${guard.name}: ${result.issues_found} issues found`,
          );
        }
        const { data: cbState } = await supabase.rpc(
          "record_circuit_breaker_failure",
          {
            p_engine_name: guard.id,
            p_reason: `Guard check failed: ${result.issues_found} issues`,
          },
        );

        if (cbState === "open") {
          incidents.push(
            `${guard.name}: QUARANTINED after 3 consecutive failures`,
          );
        }
      } else {
        totalFailed++;
        const { data: cbState } = await supabase.rpc(
          "record_circuit_breaker_failure",
          {
            p_engine_name: guard.id,
            p_reason: `Guard execution error: ${JSON.stringify(result.details)}`,
          },
        );

        if (cbState === "open") {
          incidents.push(
            `${guard.name}: QUARANTINED after 3 consecutive failures`,
          );
        }
      }

      await supabase.rpc("emit_server_event", {
        p_event_type: `sentinel:guard_${result.status}`,
        p_payload: {
          guard: guard.id,
          name: guard.name,
          checks_run: result.checks_run,
          issues_found: result.issues_found,
          duration_ms: result.duration_ms,
        },
        p_source_engine: "sentinel-server-guards",
        p_level: result.status === "pass" ? "info" : "warn",
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      results.push({
        engine: guard.id,
        status: "error",
        checks_run: 0,
        issues_found: 0,
        details: { error: msg },
        duration_ms: Date.now() - startTime,
      });
      totalFailed++;

      await supabase.rpc("record_circuit_breaker_failure", {
        p_engine_name: guard.id,
        p_reason: msg,
      });
    }
  }

  if (incidents.length > 0) {
    await supabase.functions
      .invoke("alert-dispatcher", {
        body: {
          alert_type: "sentinel_guard_incident",
          severity: "critical",
          title: `Sentinel Guards: ${incidents.length} critical issue(s)`,
          message: incidents.slice(0, 5).join("; "),
          source_system: "sentinel-server-guards",
        },
      })
      .catch((e: unknown) => {
        console.error("[sentinel-server-guards] alert dispatch failed:", e);
      });
  }

  const overallStatus =
    totalFailed === 0 && totalQuarantined === 0
      ? "green"
      : incidents.length > 0
        ? "red"
        : "yellow";

  await supabase
    .rpc("update_autonomy_status", {
      p_system_name: "sentinel_server_guards",
      p_status: overallStatus,
      p_error_message:
        totalFailed > 0
          ? `${totalFailed} guards failed, ${totalQuarantined} quarantined`
          : null,
    })
    .catch((e: unknown) => {
      console.error("[sentinel-server-guards] status update failed:", e);
    });

  return new Response(
    JSON.stringify({
      total: guardsToRun.length,
      passed: totalPassed,
      failed: totalFailed,
      quarantined: totalQuarantined,
      incidents: incidents.length,
      results,
      total_ms: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});

import { requireRouterOrigin } from "../_shared/edge-function-consolidation.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { requireServiceRole } from "../_shared/edge-auth.ts";
import { rejectQuerySecrets } from "../_shared/reject-query-secrets.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-trace-id, x-span-id, x-parent-span-id, x-request-id, traceparent",
};

interface EngineCheckResult {
  engine: string;
  status: "healthy" | "degraded" | "unhealthy" | "unknown";
  last_run_at: string | null;
  consecutive_failures: number;
  details?: string;
}

interface OmegaLoopReport {
  global_score: number;
  verdict: string;
  sub_scores: Record<string, number>;
  engine_statuses: Record<string, string>;
  critical_blockers: string[];
  warnings: string[];
  next_actions: string[];
  incidents_detected: number;
  predictions_made: number;
}

const OMEGA_ENGINES = [
  "knowledge-graph",
  "omega-memory",
  "omega-decision",
  "omega-priority",
  "omega-prediction",
  "omega-business-opportunity",
  "omega-adaptive-ux",
  "omega-self-improvement",
  "omega-incident-response",
  "omega-code-evolution",
];

const SUB_SCORE_WEIGHTS: Record<string, number> = {
  knowledge_graph: 8,
  memory: 8,
  decision: 12,
  priority: 10,
  prediction: 12,
  business_opportunity: 8,
  adaptive_ux: 7,
  self_improvement: 10,
  incident_response: 15,
  code_evolution: 10,
};

const CRITICAL_DOMAINS = [
  "wallet",
  "delivery",
  "orbit",
  "food",
  "security",
  "payment",
];

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

  try {
    await supabase.rpc("update_agent_heartbeat", {
      p_agent_name: "omega-server-loop",
      p_metadata: { started_at: new Date().toISOString() },
    });

    const engineStatuses: Record<string, string> = {};
    const engineChecks: EngineCheckResult[] = [];

    for (const engine of OMEGA_ENGINES) {
      const { data: sv } = await supabase
        .from("engine_supervisor")
        .select(
          "status, last_run_at, consecutive_failures, last_error_message",
        )
        .eq("engine_name", engine)
        .maybeSingle();

      if (!sv) {
        engineStatuses[engine] = "unknown";
        engineChecks.push({
          engine,
          status: "unknown",
          last_run_at: null,
          consecutive_failures: 0,
        });
        continue;
      }

      const failures = sv.consecutive_failures ?? 0;
      const isHealthy = sv.status === "ok" && failures === 0;
      const isDegraded =
        sv.status === "ok" && failures >= 1 && failures < 3;
      const status = isHealthy
        ? "healthy"
        : isDegraded
          ? "degraded"
          : "unhealthy";

      engineStatuses[engine] = status;
      engineChecks.push({
        engine,
        status,
        last_run_at: sv.last_run_at,
        consecutive_failures: sv.consecutive_failures ?? 0,
        details: sv.last_error_message,
      });
    }

    const { data: recentIncidents } = await supabase
      .from("monitoring_findings")
      .select("id, severity, category, title, status")
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(20);

    const activeIncidents = recentIncidents ?? [];
    const criticalIncidents = activeIncidents.filter(
      (i) => i.severity === "critical",
    );
    const highIncidents = activeIncidents.filter(
      (i) => i.severity === "high",
    );

    const { count: recentDecisionCount } = await supabase
      .from("omega_decisions")
      .select("id", { count: "exact", head: true })
      .gte(
        "created_at",
        new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      );

    const subScores: Record<string, number> = {};

    const healthyCount = engineChecks.filter(
      (e) => e.status === "healthy",
    ).length;
    const degradedCount = engineChecks.filter(
      (e) => e.status === "degraded",
    ).length;
    const unhealthyCount = engineChecks.filter(
      (e) => e.status === "unhealthy",
    ).length;

    subScores["knowledge_graph"] =
      engineStatuses["knowledge-graph"] === "healthy" ? 85 : 50;
    subScores["memory"] =
      engineStatuses["omega-memory"] === "healthy" ? 80 : 45;
    subScores["decision"] =
      engineStatuses["omega-decision"] === "healthy"
        ? 80 + Math.min(20, (recentDecisionCount ?? 0) * 2)
        : 40;
    subScores["priority"] =
      engineStatuses["omega-priority"] === "healthy" ? 75 : 50;
    subScores["prediction"] =
      engineStatuses["omega-prediction"] === "healthy" ? 70 : 40;
    subScores["business_opportunity"] =
      engineStatuses["omega-business-opportunity"] === "healthy" ? 70 : 50;
    subScores["adaptive_ux"] =
      engineStatuses["omega-adaptive-ux"] === "healthy" ? 70 : 50;
    subScores["self_improvement"] =
      engineStatuses["omega-self-improvement"] === "healthy" ? 75 : 45;
    subScores["incident_response"] =
      criticalIncidents.length === 0
        ? 90
        : Math.max(30, 90 - criticalIncidents.length * 15);
    subScores["code_evolution"] =
      engineStatuses["omega-code-evolution"] === "healthy" ? 70 : 50;

    let globalScore = 0;
    let totalWeight = 0;
    for (const [key, weight] of Object.entries(SUB_SCORE_WEIGHTS)) {
      globalScore += (subScores[key] ?? 50) * weight;
      totalWeight += weight;
    }
    globalScore =
      totalWeight > 0 ? Math.round(globalScore / totalWeight) : 50;

    const criticalBlockers: string[] = [];
    const warnings: string[] = [];

    if (criticalIncidents.length > 0) {
      criticalBlockers.push(
        `${criticalIncidents.length} critical incidents unresolved`,
      );
    }
    if (unhealthyCount >= 3) {
      criticalBlockers.push(
        `${unhealthyCount} omega engines unhealthy`,
      );
    }
    if (degradedCount > 0) {
      warnings.push(`${degradedCount} engines degraded`);
    }
    if (highIncidents.length > 3) {
      warnings.push(`${highIncidents.length} high-severity incidents open`);
    }

    let verdict: string;
    if (criticalBlockers.length > 0) verdict = "BLOCKED";
    else if (globalScore >= 80 && warnings.length === 0) verdict = "PASS";
    else if (globalScore >= 60) verdict = "PASS_WITH_WARNINGS";
    else if (globalScore >= 40) verdict = "DEGRADED";
    else verdict = "MONITOR_CLOSELY";

    const nextActions: string[] = [];

    for (const incident of criticalIncidents.slice(0, 3)) {
      nextActions.push(
        `[INCIDENT] Resolve critical: ${incident.title} (${incident.category})`,
      );
    }

    const unhealthyEngines = engineChecks
      .filter((e) => e.status === "unhealthy")
      .slice(0, 3);
    for (const eng of unhealthyEngines) {
      nextActions.push(
        `[ENGINE] Investigate ${eng.engine}: ${eng.consecutive_failures} consecutive failures`,
      );
    }

    for (const domain of CRITICAL_DOMAINS) {
      const domainIncidents = activeIncidents.filter(
        (i) => i.category === domain,
      );
      if (domainIncidents.length > 2) {
        nextActions.push(
          `[DOMAIN] ${domain}: ${domainIncidents.length} open issues — priority scan needed`,
        );
      }
    }

    const report: OmegaLoopReport = {
      global_score: globalScore,
      verdict,
      sub_scores: subScores,
      engine_statuses: engineStatuses,
      critical_blockers: criticalBlockers,
      warnings,
      next_actions: nextActions,
      incidents_detected: activeIncidents.length,
      predictions_made: 0,
    };

    await supabase.from("omega_decisions").insert({
      decision_type: "intelligence_loop",
      verdict,
      global_score: globalScore,
      sub_scores: subScores,
      critical_blockers: criticalBlockers,
      warnings,
      next_actions: nextActions,
      engine_statuses: engineStatuses,
      report_payload: report,
    });

    await supabase.rpc("emit_server_event", {
      p_event_type: "omega:intelligence_report",
      p_payload: {
        global_score: globalScore,
        verdict,
        critical_blockers: criticalBlockers.length,
        warnings: warnings.length,
        next_actions: nextActions.length,
        engines_healthy: healthyCount,
        engines_degraded: degradedCount,
        engines_unhealthy: unhealthyCount,
      },
      p_source_engine: "omega-server-loop",
      p_level:
        verdict === "BLOCKED"
          ? "critical"
          : verdict === "DEGRADED"
            ? "warn"
            : "info",
    });

    if (criticalBlockers.length > 0) {
      await supabase.functions
        .invoke("alert-dispatcher", {
          body: {
            alert_type: "omega_blocked",
            severity: "critical",
            title: `Omega Intelligence: ${verdict} (Score: ${globalScore}/100)`,
            message: criticalBlockers.slice(0, 3).join("; "),
            source_system: "omega-server-loop",
          },
        })
        .catch((e: unknown) => {
          console.error("[omega-server-loop] alert dispatch failed:", e);
        });
    }

    await supabase
      .rpc("update_autonomy_status", {
        p_system_name: "omega_server_loop",
        p_status:
          verdict === "PASS"
            ? "green"
            : verdict === "BLOCKED"
              ? "red"
              : "yellow",
        p_error_message:
          criticalBlockers.length > 0
            ? criticalBlockers.join("; ")
            : null,
      })
      .catch((e: unknown) => {
        console.error("[omega-server-loop] status update failed:", e);
      });

    return new Response(
      JSON.stringify({
        ...report,
        total_ms: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[omega-server-loop] fatal error:", msg);

    await supabase
      .rpc("update_autonomy_status", {
        p_system_name: "omega_server_loop",
        p_status: "red",
        p_error_message: msg,
      })
      .catch(() => {});

    return new Response(
      JSON.stringify({
        error: msg,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});

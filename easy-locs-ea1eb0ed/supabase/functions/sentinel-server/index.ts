import { requireRouterOrigin } from "../_shared/edge-function-consolidation.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { requireServiceRole } from "../_shared/edge-auth.ts";
import { enqueueToSqs, hasSqsCredentials } from "../_shared/aws-sqs.ts";
import { rejectQuerySecrets } from "../_shared/reject-query-secrets.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-trace-id, x-span-id, x-parent-span-id, x-request-id, traceparent",
};

interface SentinelJob {
  id: string;
  name: string;
  criticality: string;
}

const SENTINEL_JOBS: SentinelJob[] = [
  { id: "engine_heartbeat_check", name: "Engine Heartbeat Check", criticality: "critical" },
  { id: "conflict_scan", name: "Conflict Scan", criticality: "critical" },
  { id: "taxonomy_integrity_scan", name: "Taxonomy Integrity Scan", criticality: "high" },
  { id: "data_integrity_scan", name: "Data Integrity Scan", criticality: "high" },
  { id: "media_relevance_scan", name: "Media Relevance Scan", criticality: "medium" },
  { id: "seo_public_page_scan", name: "SEO Public Page Scan", criticality: "high" },
  { id: "performance_budget_scan", name: "Performance Budget Scan", criticality: "high" },
  { id: "route_integrity_scan", name: "Route Integrity Scan", criticality: "high" },
  { id: "dashboard_card_integrity_scan", name: "Dashboard Card Integrity", criticality: "medium" },
  { id: "wallet_integrity_scan", name: "Wallet Integrity Scan", criticality: "critical" },
  { id: "orbit_integrity_scan", name: "Orbit Integrity Scan", criticality: "critical" },
  { id: "delivery_integrity_scan", name: "Delivery Integrity Scan", criticality: "critical" },
  { id: "flight_integrity_scan", name: "Flight Integrity Scan", criticality: "high" },
  { id: "security_scan", name: "Security Scan", criticality: "critical" },
  { id: "dependency_scan", name: "Dependency Scan", criticality: "medium" },
  { id: "stale_data_cleanup", name: "Stale Data Cleanup", criticality: "low" },
  { id: "orphan_cleanup", name: "Orphan Cleanup", criticality: "low" },
  { id: "cache_revalidate", name: "Cache Revalidation", criticality: "medium" },
  { id: "full_god_audit", name: "Full God Audit", criticality: "critical" },
  { id: "invariant_check", name: "Invariant Check", criticality: "critical" },
  { id: "healing_scan", name: "Healing Scan", criticality: "medium" },
  { id: "workflow_health_check", name: "Workflow Health Check", criticality: "high" },
  { id: "quality_gate_refresh", name: "Quality Gate Refresh", criticality: "high" },
  { id: "observability_snapshot", name: "Observability Snapshot", criticality: "medium" },
  { id: "incident_check", name: "Incident Check", criticality: "high" },
];

const JOB_TO_ENGINE: Record<string, string> = {
  engine_heartbeat_check: "engine-health",
  conflict_scan: "entity-integrity",
  taxonomy_integrity_scan: "taxonomy-remap",
  data_integrity_scan: "data-completeness",
  media_relevance_scan: "data-trust-scan",
  seo_public_page_scan: "seo-check",
  performance_budget_scan: "performance-audit",
  route_integrity_scan: "entity-integrity",
  dashboard_card_integrity_scan: "coherence-sweep",
  wallet_integrity_scan: "wallet-sync",
  orbit_integrity_scan: "entity-integrity",
  delivery_integrity_scan: "delivery-monitor",
  flight_integrity_scan: "entity-integrity",
  security_scan: "audit-trail",
  dependency_scan: "audit-trail",
  stale_data_cleanup: "shop-cleanup",
  orphan_cleanup: "shop-cleanup",
  cache_revalidate: "entity-state-healing",
  full_god_audit: "audit-trail",
  invariant_check: "entity-integrity",
  healing_scan: "self-healing-scan",
  workflow_health_check: "automation-workflows",
  quality_gate_refresh: "shop-quality",
  observability_snapshot: "health-checks",
  incident_check: "engine-health",
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

  let requestedJobs: string[] | null = null;
  let bodyPayload: Record<string, unknown> = {};
  try {
    const body = await req.json();
    bodyPayload = body ?? {};
    if (body?.job) requestedJobs = [body.job];
    if (body?.jobs && Array.isArray(body.jobs)) requestedJobs = body.jobs;
  } catch { /* no body = run all */ }

  if (!(bodyPayload as Record<string, unknown>)._from_queue && hasSqsCredentials()) {
    const sqsResult = await enqueueToSqs("easy-locs-analytics", {
      ...bodyPayload,
      _from_queue: true,
      _source: "sentinel-server",
    });
    if (sqsResult.success) {
      return new Response(
        JSON.stringify({ offloaded: true, messageId: sqsResult.messageId }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    console.warn("[sentinel-server] SQS offload failed, processing locally:", sqsResult.error);
  }

  const jobsToRun = requestedJobs
    ? SENTINEL_JOBS.filter((j) => requestedJobs!.includes(j.id))
    : SENTINEL_JOBS;

  const results: Record<string, unknown> = {};
  let passed = 0;
  let failed = 0;
  let incidents: string[] = [];

  for (const job of jobsToRun) {
    const engineModule = JOB_TO_ENGINE[job.id];
    if (!engineModule) {
      results[job.id] = { status: "skipped", reason: "no_engine_mapping" };
      continue;
    }

    try {
      const { data: sv } = await supabase
        .from("engine_supervisor")
        .select("status, last_run_at, last_error_message, consecutive_failures")
        .eq("engine_name", engineModule)
        .maybeSingle();

      if (!sv) {
        results[job.id] = { status: "unknown", reason: "no_supervisor_data" };
        continue;
      }

      const isHealthy = sv.status === "ok" && (sv.consecutive_failures ?? 0) < 3;

      if (isHealthy) {
        results[job.id] = {
          status: "pass",
          engine: engineModule,
          last_run: sv.last_run_at,
        };
        passed++;
      } else {
        results[job.id] = {
          status: "fail",
          engine: engineModule,
          error: sv.last_error_message,
          consecutive_failures: sv.consecutive_failures,
        };
        failed++;
        if (job.criticality === "critical") {
          incidents.push(`${job.name} (${engineModule}): ${sv.last_error_message || "degraded"}`);
        }
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      results[job.id] = { status: "error", error: msg };
      failed++;
    }
  }

  if (incidents.length > 0) {
    await supabase.functions.invoke("alert-dispatcher", {
      body: {
        alert_type: "sentinel_incident",
        severity: "critical",
        title: `Sentinel: ${incidents.length} critical check(s) failed`,
        message: incidents.slice(0, 5).join("; "),
        source_system: "sentinel-server",
      },
    }).catch((e: unknown) => {
      console.error("[sentinel-server] alert dispatch failed:", e);
    });
  }

  await supabase.rpc("update_autonomy_status", {
    p_system_name: "sentinel_server",
    p_status: failed === 0 ? "green" : incidents.length > 0 ? "red" : "yellow",
    p_error_message: failed > 0 ? `${failed} sentinel checks failed` : null,
  }).catch((e: unknown) => {
    console.error("[sentinel-server] status update failed:", e);
  });

  return new Response(
    JSON.stringify({
      total: jobsToRun.length,
      passed,
      failed,
      incidents: incidents.length,
      results,
      timestamp: new Date().toISOString(),
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});

import { requireRouterOrigin } from "../_shared/edge-function-consolidation.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { requireAuthenticatedUser } from "../_shared/edge-auth.ts";
import { rejectQuerySecrets } from "../_shared/reject-query-secrets.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-trace-id, x-span-id, x-parent-span-id, x-request-id, traceparent",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Action =
  | "persist_checkpoint"
  | "record_anomaly_window"
  | "upsert_dashboard_card"
  | "record_db_observability"
  | "toggle_kill_switch"
  | "set_domain_degradation"
  | "check_queue_dedup"
  | "batch_persist";

const ADMIN_ONLY_ACTIONS = new Set<Action>([
  "toggle_kill_switch",
  "set_domain_degradation",
]);

const SERVER_PRIVILEGED_ACTIONS = new Set<Action>([
  "persist_checkpoint",
  "record_anomaly_window",
  "upsert_dashboard_card",
  "record_db_observability",
  "check_queue_dedup",
  "batch_persist",
]);

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
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
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
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const auth = await requireAuthenticatedUser(req);
  if (!auth.authorized) return auth.response!;

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  let body: { action: Action; payload: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { action, payload } = body;

  if (ADMIN_ONLY_ACTIONS.has(action)) {
    const adminCheck = await requireAdmin(supabase, auth.userId!);
    if (!adminCheck.isAdmin) return adminCheck.response!;
  }

  if (SERVER_PRIVILEGED_ACTIONS.has(action)) {
    const adminCheck = await requireAdmin(supabase, auth.userId!);
    if (!adminCheck.isAdmin) {
      return new Response(
        JSON.stringify({ error: "Server-privileged action requires admin or service-role access" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
  }

  try {
    const result = await executeAction(supabase, action, payload);
    return new Response(JSON.stringify({ ok: true, ...result }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function validatePayloadShape(action: Action, payload: Record<string, unknown>): string | null {
  switch (action) {
    case "persist_checkpoint": {
      if (!payload.flowId || typeof payload.flowId !== "string") return "flowId (string) required";
      if (!payload.machineName || typeof payload.machineName !== "string") return "machineName (string) required";
      if (!payload.currentState || typeof payload.currentState !== "string") return "currentState (string) required";
      if (!payload.event || typeof payload.event !== "string") return "event (string) required";
      return null;
    }
    case "record_anomaly_window": {
      if (!payload.domain || typeof payload.domain !== "string") return "domain (string) required";
      if (!payload.windowStart || !payload.windowEnd) return "windowStart and windowEnd required";
      return null;
    }
    case "upsert_dashboard_card": {
      if (!payload.cardId || typeof payload.cardId !== "string") return "cardId (string) required";
      if (!payload.cardType || typeof payload.cardType !== "string") return "cardType (string) required";
      if (!payload.domain || typeof payload.domain !== "string") return "domain (string) required";
      if (!payload.title || typeof payload.title !== "string") return "title (string) required";
      return null;
    }
    case "record_db_observability": {
      if (!payload.metricName || typeof payload.metricName !== "string") return "metricName (string) required";
      if (typeof payload.metricValue !== "number") return "metricValue (number) required";
      return null;
    }
    case "toggle_kill_switch": {
      if (!payload.feature || typeof payload.feature !== "string") return "feature (string) required";
      if (typeof payload.enabled !== "boolean") return "enabled (boolean) required";
      return null;
    }
    case "set_domain_degradation": {
      if (!payload.domain || typeof payload.domain !== "string") return "domain (string) required";
      if (!payload.mode || typeof payload.mode !== "string") return "mode (string) required";
      return null;
    }
    case "check_queue_dedup": {
      if (!payload.fingerprint || typeof payload.fingerprint !== "string") return "fingerprint (string) required";
      if (!payload.queueName || typeof payload.queueName !== "string") return "queueName (string) required";
      if (!payload.jobId || typeof payload.jobId !== "string") return "jobId (string) required";
      return null;
    }
    case "batch_persist": {
      if (!Array.isArray(payload.items)) return "items (array) required";
      return null;
    }
    default:
      return `Unknown action: ${action}`;
  }
}

async function executeAction(
  supabase: ReturnType<typeof createClient>,
  action: Action,
  payload: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const validationError = validatePayloadShape(action, payload);
  if (validationError) {
    throw new Error(`Invalid payload for ${action}: ${validationError}`);
  }

  switch (action) {
    case "persist_checkpoint": {
      const { data, error } = await supabase.rpc(
        "record_state_machine_checkpoint",
        {
          p_flow_id: payload.flowId as string,
          p_flow_type: payload.machineName as string,
          p_machine_name: payload.machineName as string,
          p_current_state: payload.currentState as string,
          p_previous_state: payload.previousState as string,
          p_event: payload.event as string,
          p_transition_id: payload.transitionId as string,
          p_guard_results: payload.guardResults ?? {},
          p_context_data: payload.contextData ?? {},
        },
      );
      if (error) throw new Error(`checkpoint: ${error.message}`);
      return { checkpointId: data };
    }

    case "record_anomaly_window": {
      const { data, error } = await supabase.rpc("record_anomaly_window", {
        p_domain: payload.domain as string,
        p_window_start: payload.windowStart as string,
        p_window_end: payload.windowEnd as string,
        p_error_count: payload.errorCount ?? 0,
        p_success_count: payload.successCount ?? 0,
        p_error_velocity: payload.errorVelocity ?? 0,
        p_p95_latency_ms: payload.p95LatencyMs ?? 0,
        p_p99_latency_ms: payload.p99LatencyMs ?? 0,
        p_retry_storm_count: payload.retryStormCount ?? 0,
        p_queue_backlog_depth: payload.queueBacklogDepth ?? 0,
        p_mutation_rejection_rate: payload.mutationRejectionRate ?? 0,
        p_reconnect_frequency: payload.reconnectFrequency ?? 0,
        p_invalid_transition_count: payload.invalidTransitionCount ?? 0,
        p_stale_data_frequency: payload.staleDataFrequency ?? 0,
        p_anomaly_detected: payload.anomalyDetected ?? false,
        p_actions_taken: payload.actionsTaken ?? [],
      });
      if (error) throw new Error(`anomaly_window: ${error.message}`);
      return { windowId: data };
    }

    case "upsert_dashboard_card": {
      const { error } = await supabase.rpc("upsert_dashboard_card", {
        p_card_id: payload.cardId as string,
        p_card_type: payload.cardType as string,
        p_domain: payload.domain as string,
        p_title: payload.title as string,
        p_value: payload.value ?? {},
        p_status: payload.status ?? "ok",
        p_freshness_ttl: payload.freshnessTtl ?? 300,
        p_owner_query: payload.ownerQuery ?? null,
      });
      if (error) throw new Error(`dashboard_card: ${error.message}`);
      return { upserted: true };
    }

    case "record_db_observability": {
      const { data, error } = await supabase.rpc("record_db_observability", {
        p_metric_name: payload.metricName as string,
        p_metric_value: payload.metricValue as number,
        p_metric_unit: payload.metricUnit ?? "count",
        p_threshold_warn: payload.thresholdWarn ?? null,
        p_threshold_crit: payload.thresholdCrit ?? null,
        p_metadata: payload.metadata ?? {},
      });
      if (error) throw new Error(`db_observability: ${error.message}`);
      return { metricId: data };
    }

    case "toggle_kill_switch": {
      const { data, error } = await supabase.rpc("toggle_kill_switch_server", {
        p_feature: payload.feature as string,
        p_enabled: payload.enabled as boolean,
        p_actor: payload.actor ?? "admin",
        p_reason: payload.reason ?? null,
      });
      if (error) throw new Error(`kill_switch: ${error.message}`);
      return { result: data };
    }

    case "set_domain_degradation": {
      const { data, error } = await supabase.rpc("set_domain_degradation", {
        p_domain: payload.domain as string,
        p_mode: payload.mode as string,
        p_actor: payload.actor ?? "admin",
        p_reason: payload.reason ?? null,
        p_auto_restore_minutes: payload.autoRestoreMinutes ?? null,
      });
      if (error) throw new Error(`domain_degradation: ${error.message}`);
      return { result: data };
    }

    case "check_queue_dedup": {
      const { data, error } = await supabase.rpc("check_queue_dedup", {
        p_fingerprint: payload.fingerprint as string,
        p_queue_name: payload.queueName as string,
        p_job_id: payload.jobId as string,
        p_window_seconds: payload.windowSeconds ?? 300,
      });
      if (error) throw new Error(`queue_dedup: ${error.message}`);
      return { isDuplicate: data };
    }

    case "batch_persist": {
      const BATCH_ALLOWED_ACTIONS = new Set<Action>([
        "persist_checkpoint",
        "record_anomaly_window",
        "upsert_dashboard_card",
        "record_db_observability",
        "check_queue_dedup",
      ]);

      const items = payload.items as Array<{
        action: Action;
        payload: Record<string, unknown>;
      }>;
      const results: Array<{ action: string; ok: boolean; error?: string }> =
        [];
      for (const item of items) {
        if (!BATCH_ALLOWED_ACTIONS.has(item.action)) {
          results.push({
            action: item.action,
            ok: false,
            error: `Action "${item.action}" is not permitted in batch_persist`,
          });
          continue;
        }
        try {
          await executeAction(supabase, item.action, item.payload);
          results.push({ action: item.action, ok: true });
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          results.push({ action: item.action, ok: false, error: msg });
        }
      }
      return { results };
    }

    default:
      throw new Error(`Unknown action: ${action}`);
  }
}

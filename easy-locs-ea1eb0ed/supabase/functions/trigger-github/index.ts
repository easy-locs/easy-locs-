/**
 * trigger-github — Operator Edge Function that enqueues a GitHub-runner task.
 *
 * Dispatch path (single source of truth):
 *   1. Validate JWT.
 *   2. Assert "admin" app_role via public.has_role.
 *   3. Call canonical system.dispatch_execution_task RPC with the new
 *      p_runner='github' contract param (added in migration
 *      20260423000000_goal_engine_phase3.sql) — no post-RPC patching.
 *
 * Returns: { task_id, status }
 */
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { rejectQuerySecrets } from "../_shared/reject-query-secrets.ts";
import {
  buildMethodNotAllowedResponse,
  isAllowedTriggerGithubMethod,
} from "./method-guard.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-trace-id, x-span-id, x-parent-span-id, x-request-id, traceparent",
};

const GITHUB_RUNNER_DOMAIN = "github-runner";
const SMOKE_NOOP = "SMOKE_NOOP";

Deno.serve(async (req) => {
  const __qsCheck = rejectQuerySecrets(req);
  if (__qsCheck.rejected) return __qsCheck.response!;

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Lock the endpoint to POST-only requests. This Edge Function dispatches a
  // real workflow run on every successful call, so any other method (GET,
  // HEAD, PUT, PATCH, DELETE, …) — including stray health probes or
  // accidental browser navigations — must be rejected with 405 before we
  // touch auth, RPCs or the runner.
  if (!isAllowedTriggerGithubMethod(req.method)) {
    return buildMethodNotAllowedResponse(corsHeaders);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user }, error: authError } = await userClient.auth.getUser();
  if (authError || !user) {
    return new Response(JSON.stringify({ error: "Invalid or expired token" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const serviceClient = createClient(supabaseUrl, serviceKey);
  const { data: adminCheck } = await serviceClient
    .rpc("has_role", { _user_id: user.id, _role: "admin" });
  if (!adminCheck) {
    return new Response(
      JSON.stringify({ error: "Admin role required to trigger agent runs" }),
      {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  // Optional JSON body { prompt?: string } — when called from the Command
  // Center the user's prompt is embedded in the payload so the GitHub run
  // shows a meaningful label and the dashboard can surface it back to the
  // user from system.execution_tasks (no agent_tasks write any more).
  //
  // Track 3 (#843): no silent swallow. An empty body is fine on POST (the
  // smoke-test path), but malformed JSON is a client bug — emit a
  // structured log AND return a 400 so the caller sees it.
  let prompt = "";
  if (req.method === "POST") {
    const raw = await req.text();
    if (raw.length > 0) {
      try {
        const body = JSON.parse(raw) as { prompt?: unknown };
        if (typeof body?.prompt === "string") {
          prompt = body.prompt.slice(0, 500);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(JSON.stringify({
          event: "trigger_github.invalid_request_body",
          level: "error",
          method: req.method,
          body_bytes: raw.length,
          message,
        }));
        return new Response(
          JSON.stringify({ error: "Request body must be valid JSON" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }
  }
  const label = prompt.trim() || "smoke-test";

  try {
    const { data: task, error: rpcError } = await userClient
      .schema("system")
      .rpc("dispatch_execution_task", {
        p_type: SMOKE_NOOP,
        p_domain: GITHUB_RUNNER_DOMAIN,
        p_risk_level: "SAFE",
        p_status: "queued",
        p_payload: {
          label,
          prompt,
          triggered_by: "command-center",
          triggered_at: new Date().toISOString(),
        },
        p_requested_by: user.id,
        p_max_attempts: 3,
        p_runner: "github",
      });

    if (rpcError) {
      console.error("[trigger-github] dispatch_execution_task error:", rpcError.message);
      return new Response(
        JSON.stringify({ error: rpcError.message }),
        {
          status: rpcError.code === "42501" ? 403 : 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (!task?.id) {
      return new Response(
        JSON.stringify({ error: "dispatch_execution_task returned no row" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    return new Response(
      JSON.stringify({ task_id: task.id, status: task.status }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[trigger-github] unexpected error:", msg);
    return new Response(
      JSON.stringify({ error: msg }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});

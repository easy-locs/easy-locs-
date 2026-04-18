/**
 * dev-planner — Level C · L3 (Task #876).
 *
 * Decomposes a developer INTENT ("ajoute un endpoint /api/foo qui retourne
 * X") into an ordered list of `code.edit` / `build.run` / `test.run` steps
 * the LC4 builder can dispatch through the canonical execution pipeline.
 *
 * Pipeline:
 *   1. Auth + admin gate (planner is operator-tooling, never user-facing).
 *   2. Build the user message from `intent` + optional `context`.
 *   3. Call the LLM via `dispatchAiCompletion` (Level B). Zero new AI path.
 *   4. Strict-validate the returned plan against `validateDevPlan`. On any
 *      failure, fall back to the deterministic 3-step plan so the caller
 *      always has something to persist for audit.
 *   5. If `task_id` is provided, merge the plan into
 *      `system.execution_tasks.payload.plan` (the `intent_payload.plan`
 *      slot referenced by task #876). Plan is ALSO mirrored on
 *      `payload.dev_plan` for forward-compat with renderers that key on
 *      the explicit `dev_plan` namespace.
 *   6. Return the plan + source + provider so the caller (LC4 or a
 *      Command Center "Plan only" UI) can decide what to do next.
 *
 * Critical:
 *   - The planner NEVER invokes a tool. It only produces and persists
 *     a plan.
 *   - All LLM access goes through `dispatchAiCompletion` — same agent
 *     registry, same quotas, same `ai_interactions` audit row as every
 *     other Level B caller.
 */

// @ts-expect-error — Deno remote import resolved at edge runtime.
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { rejectQuerySecrets } from "../_shared/reject-query-secrets.ts";
import {
  dispatchAiCompletion,
  type AiCompletionOutput,
  type AiDispatchOutcome,
} from "../_shared/execution/ai-dispatch.ts";
import {
  type DevPlan,
  type DevPlannerCompletion,
  mergePlanIntoPayload,
  runDevPlanner,
} from "../_shared/execution/types/dev-plan.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-trace-id, x-span-id, x-parent-span-id, x-request-id, traceparent",
};

function adaptOutcome(
  outcome: AiDispatchOutcome<AiCompletionOutput>,
): DevPlannerCompletion {
  return {
    status: outcome.status,
    output: outcome.output
      ? {
          text: outcome.output.text,
          json: outcome.output.json,
          interaction: {
            provider: outcome.output.interaction.provider,
            model: outcome.output.interaction.model,
          },
        }
      : null,
    errorCode: outcome.errorCode,
    errorMessage: outcome.errorMessage,
  };
}

interface PersistResult {
  persisted: boolean;
  reason?: string;
}

async function persistPlan(
  serviceClient: ReturnType<typeof createClient>,
  taskId: string,
  plan: DevPlan,
  meta: { source: "ai" | "fallback"; provider: string | null; model: string | null },
): Promise<PersistResult> {
  // Read the existing payload, merge, then write back. We cannot rely on
  // jsonb_set inside PostgREST without a helper RPC; the merge-on-client
  // pattern matches what goal-planner does and is safe because each
  // dev-planner invocation is the sole writer for its own task_id (the
  // LC4 builder serialises planning per task).
  const { data: row, error: readErr } = await serviceClient
    .schema("system")
    .from("execution_tasks")
    .select("payload")
    .eq("id", taskId)
    .maybeSingle();
  if (readErr) {
    return { persisted: false, reason: `read failed: ${readErr.message}` };
  }
  if (!row) {
    return { persisted: false, reason: "task not found" };
  }
  const existing =
    (row.payload && typeof row.payload === "object" ? row.payload : {}) as Record<
      string,
      unknown
    >;
  const nextPayload = mergePlanIntoPayload(existing, plan, {
    source: meta.source,
    provider: meta.provider,
    model: meta.model,
  });
  const { error: writeErr } = await serviceClient
    .schema("system")
    .from("execution_tasks")
    .update({ payload: nextPayload })
    .eq("id", taskId);
  if (writeErr) {
    return { persisted: false, reason: `write failed: ${writeErr.message}` };
  }
  return { persisted: true };
}

// @ts-expect-error — Deno global, only present at edge runtime.
Deno.serve(async (req: Request) => {
  const __qs = rejectQuerySecrets(req);
  if (__qs.rejected) return __qs.response!;
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // @ts-expect-error — Deno global.
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  // @ts-expect-error — Deno global.
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  // @ts-expect-error — Deno global.
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: authError } = await userClient.auth.getUser();
  if (authError || !user) {
    return new Response(
      JSON.stringify({ error: "Invalid or expired token" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const serviceClient = createClient(supabaseUrl, serviceKey);
  const { data: isAdmin } = await serviceClient.rpc("has_role", {
    _user_id: user.id,
    _role: "admin",
  });
  if (!isAdmin) {
    return new Response(
      JSON.stringify({ error: "Admin role required to run the dev planner" }),
      { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  let body: { intent?: string; context?: string; task_id?: string; correlation_id?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON body" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
  const intent = body.intent?.trim();
  if (!intent) {
    return new Response(
      JSON.stringify({ error: "intent is required" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const result = await runDevPlanner({
    intent,
    context: body.context?.trim() || undefined,
    complete: async (systemPrompt, userMessage) => {
      const outcome = await dispatchAiCompletion(
        {
          feature: "dev-planner",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage },
          ],
          temperature: 0.2,
          maxTokens: 1200,
          responseFormat: "json",
          purpose: "general",
        },
        {
          feature: "dev-planner",
          correlationId: body.correlation_id,
          requestedBy: `edge:dev-planner:${user.id}`,
        },
      );
      return adaptOutcome(outcome);
    },
  });

  let persistence: PersistResult = { persisted: false };
  if (body.task_id) {
    persistence = await persistPlan(serviceClient, body.task_id, result.plan, {
      source: result.source,
      provider: result.provider,
      model: result.model,
    });
  }

  return new Response(
    JSON.stringify({
      intent,
      plan: result.plan,
      plan_source: result.source,
      plan_provider: result.provider,
      plan_model: result.model,
      fallback_reason: result.fallbackReason,
      task_id: body.task_id ?? null,
      persisted: persistence.persisted,
      persistence_reason: persistence.reason ?? null,
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});

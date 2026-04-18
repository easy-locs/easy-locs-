/**
 * goal-planner — Phase 2/3 of the Goal Engine.
 *
 * Input:  { goal_id: string }
 * Output: {
 *   goal_id, iteration_id, iteration_number, plan, plan_source,
 *   plan_provider, dispatched, mode
 * }
 *
 * Pipeline:
 *   1. Auth + admin gate.
 *   2. Load the goal (RLS-scoped).
 *   3. Load top learning_memory patterns to inject as context (Phase 4 read).
 *   4. Generate a plan via ai-router (with strict whitelist + JSON contract)
 *      OR deterministic fallback when no AI key / parse failure.
 *   5. Pre-create a system.goal_iterations row (next iteration number,
 *      task_ids = []).
 *   6. If goal.mode='execute': dispatch each step via the canonical
 *      system.dispatch_execution_task RPC, passing the new p_goal_id and
 *      p_runner contract params (no post-RPC patching).
 *      If goal.mode='plan': skip dispatch — return the plan only.
 *   7. Persist task_ids onto the iteration row.
 *   8. Compute iteration outcome immediately (will be 'pending' until tasks
 *      finish; UI / cron can re-call compute_goal_iteration_outcome).
 */
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { rejectQuerySecrets } from "../_shared/reject-query-secrets.ts";
import { dispatchAiCompletion } from "../_shared/execution/ai-dispatch.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-trace-id, x-span-id, x-parent-span-id, x-request-id, traceparent",
};

interface PlanStep {
  type: string;
  domain: string;
  rationale: string;
  payload?: Record<string, unknown>;
}

interface DispatchSummary {
  task_id: string | null;
  type: string;
  domain: string;
  status: string | null;
  error?: string;
}

// (domain, type) pairs the planner may emit. Each entry mirrors a registered
// agent capability OR a runner-bridge contract. Adding entries here is the
// ONLY way to expand planner reach — fail-closed by design.
const SUPPORTED_STEPS: Array<{
  domain: string;
  type: string;
  runner: "github" | "internal";
  requires_approval: boolean;
  description: string;
}> = [
  {
    domain: "github-runner",
    type: "SMOKE_NOOP",
    runner: "github",
    requires_approval: false,
    description: "GitHub Actions smoke test — proves the runner bridge is alive.",
  },
  {
    domain: "marketplace",
    type: "MARKETPLACE.LISTING.UNPUBLISH",
    runner: "internal",
    requires_approval: false,
    description: "Pause a marketplace listing (medium-risk; auto-rollback ready).",
  },
  {
    domain: "marketplace",
    type: "MARKETPLACE.LISTING.PUBLISH",
    runner: "internal",
    requires_approval: true,
    description:
      "Publish a marketplace listing (medium-risk, KYC-gated; requires human approval).",
  },
];

const PLANNER_SYSTEM_PROMPT = `You are the Planner agent of a governed self-evolving platform.

Your job: read the user's high-level GOAL and break it into an ordered list of
small, concrete EXECUTION STEPS that the platform can run today.

You MUST respond with valid JSON of the exact shape:
{
  "summary": "one-sentence restatement of the goal",
  "steps": [
    { "type": "STEP_TYPE", "domain": "STEP_DOMAIN", "rationale": "why this step" }
  ]
}

Rules:
- Use ONLY the (domain, type) pairs listed below. Any other pair is invalid and
  will cause the entire plan to be rejected.
- Emit at most 3 steps. Prefer 1 step if the goal is simple.
- Order matters: earlier steps run first.
- Rationale must be one short sentence in business language.
- If you have prior LEARNED PATTERNS, prefer steps with higher success_rate.

Allowed (domain, type) pairs:
${SUPPORTED_STEPS.map((s) => `  • domain="${s.domain}", type="${s.type}" — ${s.description}`).join("\n")}`;

function deterministicFallback(goalTitle: string): PlanStep[] {
  return [{
    type: "SMOKE_NOOP",
    domain: "github-runner",
    rationale: `Deterministic fallback: smoke-test the runner for goal "${goalTitle}".`,
  }];
}

function validatePlan(raw: unknown, goalTitle: string): PlanStep[] {
  if (!raw || typeof raw !== "object") return deterministicFallback(goalTitle);
  const stepsRaw = (raw as { steps?: unknown }).steps;
  if (!Array.isArray(stepsRaw) || stepsRaw.length === 0) {
    return deterministicFallback(goalTitle);
  }
  const out: PlanStep[] = [];
  for (const s of stepsRaw.slice(0, 3)) {
    if (!s || typeof s !== "object") continue;
    const obj = s as Record<string, unknown>;
    const type = String(obj.type ?? "").trim().toUpperCase();
    const domain = String(obj.domain ?? "").trim();
    const ok = SUPPORTED_STEPS.some((p) => p.type === type && p.domain === domain);
    if (!ok) continue;
    out.push({
      type,
      domain,
      rationale: String(obj.rationale ?? "").slice(0, 240) || "(no rationale)",
      payload: typeof obj.payload === "object" && obj.payload
        ? (obj.payload as Record<string, unknown>)
        : undefined,
    });
  }
  return out.length > 0 ? out : deterministicFallback(goalTitle);
}

async function loadLearnedPatterns(serviceClient: ReturnType<typeof createClient>): Promise<string> {
  try {
    const { data } = await serviceClient
      .schema("system")
      .from("learning_memory")
      .select("pattern, attempts, successes, success_rate")
      .order("last_used_at", { ascending: false })
      .limit(10);
    if (!data || data.length === 0) return "";
    const lines = data
      .filter((r: Record<string, unknown>) => (r.attempts as number) > 0)
      .map((r: Record<string, unknown>) =>
        `  • ${r.pattern} — ${r.successes}/${r.attempts} success (rate=${r.success_rate ?? "n/a"})`
      );
    return lines.length > 0
      ? `\n\nLEARNED PATTERNS (most recent first):\n${lines.join("\n")}`
      : "";
  } catch {
    return "";
  }
}

async function generatePlan(
  goalTitle: string,
  goalDescription: string | null,
  learned: string,
  correlationId?: string,
): Promise<{ plan: PlanStep[]; source: "ai" | "fallback"; provider?: string }> {
  try {
    const userMsg = `GOAL TITLE: ${goalTitle}\n\nGOAL DESCRIPTION:\n${goalDescription ?? "(none)"}${learned}`;
    // LB1 Cleanup #842: migrated from legacy aiRouteAndParse() to the
    // canonical dispatchAiCompletion() so the call goes through the
    // registered ai.completion agent (policy gate + ai_interactions row +
    // agent quota). Provider selection is registry-driven now — no
    // per-call override.
    const outcome = await dispatchAiCompletion(
      {
        feature: "goal-planner",
        messages: [
          { role: "system", content: PLANNER_SYSTEM_PROMPT },
          { role: "user", content: userMsg },
        ],
        temperature: 0.2,
        maxTokens: 600,
        responseFormat: "json",
        purpose: "general",
      },
      { feature: "goal-planner", correlationId },
    );
    if (outcome.status !== "succeeded" || !outcome.output) {
      console.warn(
        `[goal-planner] dispatch did not succeed (status=${outcome.status}, code=${outcome.errorCode ?? "n/a"}); using fallback`,
      );
      return { plan: deterministicFallback(goalTitle), source: "fallback" };
    }
    const parsed = outcome.output.json ?? JSON.parse(outcome.output.text);
    const plan = validatePlan(parsed, goalTitle);
    return { plan, source: "ai", provider: outcome.output.interaction.provider };
  } catch (e) {
    console.warn("[goal-planner] AI plan failed, using fallback:", e instanceof Error ? e.message : e);
    return { plan: deterministicFallback(goalTitle), source: "fallback" };
  }
}

Deno.serve(async (req) => {
  const __qs = rejectQuerySecrets(req);
  if (__qs.rejected) return __qs.response!;
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

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
  const { data: isAdmin } = await serviceClient
    .rpc("has_role", { _user_id: user.id, _role: "admin" });
  if (!isAdmin) {
    return new Response(
      JSON.stringify({ error: "Admin role required to run the planner" }),
      {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  let body: { goal_id?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const goalId = body.goal_id?.trim();
  if (!goalId) {
    return new Response(JSON.stringify({ error: "goal_id is required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: goal, error: loadError } = await userClient
    .schema("system")
    .from("goals")
    .select("id, title, description, status, mode")
    .eq("id", goalId)
    .single();

  if (loadError || !goal) {
    return new Response(
      JSON.stringify({ error: loadError?.message ?? "Goal not found" }),
      {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
  if (goal.status !== "active") {
    return new Response(
      JSON.stringify({ error: `Goal is ${goal.status}; only active goals can be planned` }),
      {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  const learned = await loadLearnedPatterns(serviceClient);
  const { plan, source, provider } = await generatePlan(goal.title, goal.description, learned, goal.id);

  // Create iteration row up-front so planning is always recorded — even if
  // dispatch fails partially or goal is in 'plan' mode.
  const { data: iterNum } = await serviceClient.schema("system")
    .rpc("next_goal_iteration_number", { p_goal_id: goal.id });
  const { data: iter, error: iterErr } = await serviceClient
    .schema("system")
    .from("goal_iterations")
    .insert({
      goal_id: goal.id,
      iteration_number: iterNum ?? 1,
      task_ids: [],
      plan,
      plan_source: source,
      plan_provider: provider ?? null,
      summary: `${plan.length} step(s) planned${goal.mode === "plan" ? " — plan-only mode" : ""}.`,
    })
    .select("id, iteration_number")
    .single();

  if (iterErr || !iter) {
    console.error("[goal-planner] iteration insert failed:", iterErr?.message);
    return new Response(
      JSON.stringify({ error: iterErr?.message ?? "iteration insert failed" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  const dispatched: DispatchSummary[] = [];
  const taskIds: string[] = [];

  if (goal.mode === "execute") {
    for (const step of plan) {
      const meta = SUPPORTED_STEPS.find((p) => p.type === step.type && p.domain === step.domain);
      try {
        const { data: task, error: rpcError } = await userClient
          .schema("system")
          .rpc("dispatch_execution_task", {
            p_type: step.type,
            p_domain: step.domain,
            p_risk_level: "SAFE",
            p_status: "queued",
            p_payload: {
              ...(step.payload ?? {}),
              goal_id: goal.id,
              goal_title: goal.title,
              iteration_id: iter.id,
              iteration_number: iter.iteration_number,
              rationale: step.rationale,
              triggered_by: "goal-planner",
              triggered_at: new Date().toISOString(),
            },
            p_requested_by: user.id,
            p_max_attempts: 3,
            p_correlation_id: goal.id,
            p_requires_approval: meta?.requires_approval ?? false,
            p_goal_id: goal.id,
            p_runner: meta?.runner ?? "internal",
          });

        if (rpcError || !task?.id) {
          dispatched.push({
            task_id: null,
            type: step.type,
            domain: step.domain,
            status: null,
            error: rpcError?.message ?? "dispatch returned no row",
          });
          continue;
        }
        taskIds.push(task.id);
        dispatched.push({
          task_id: task.id,
          type: step.type,
          domain: step.domain,
          status: task.status,
        });
      } catch (e: unknown) {
        dispatched.push({
          task_id: null,
          type: step.type,
          domain: step.domain,
          status: null,
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }

    if (taskIds.length > 0) {
      await serviceClient
        .schema("system")
        .from("goal_iterations")
        .update({ task_ids: taskIds })
        .eq("id", iter.id);
      // Compute initial outcome — most likely 'pending' since tasks just queued.
      await serviceClient.schema("system")
        .rpc("compute_goal_iteration_outcome", { p_iteration_id: iter.id });
    }
  }

  return new Response(
    JSON.stringify({
      goal_id: goal.id,
      iteration_id: iter.id,
      iteration_number: iter.iteration_number,
      mode: goal.mode,
      plan,
      plan_source: source,
      plan_provider: provider ?? null,
      dispatched,
    }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
});

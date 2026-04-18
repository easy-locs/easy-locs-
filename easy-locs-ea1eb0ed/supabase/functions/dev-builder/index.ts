/**
 * dev-builder — LC4 (task #878).
 *
 * HTTP entry point that takes a `builder_task_id` — an `execution_tasks`
 * row of type `EXECUTE_DEV_PLAN` whose `payload.plan` was populated by
 * LC3 — and runs the dev builder loop to convergence, opening a PR on
 * success. The same row id is the parent of every per-step child row
 * dispatched by the loop and the subject of `system.request_dev_replan`
 * on red verifier verdicts, so the row identity is the one canonical
 * contract end-to-end.
 *
 * The driver lives in
 * `_shared/execution/builders/dev-builder-loop.ts` (pure loop) and
 * `_shared/execution/builders/dev-builder-runtime.ts` (production
 * wiring) so the integration test (vitest, Node) can import them
 * without dragging in `npm:` runtime imports or `Deno.serve`. This
 * file is the HTTP + auth + IO glue:
 *   - admin / service-role gate via `requireServiceRole`
 *   - load the parent (builder) task row + its plan
 *   - resolve `dev.builder` quotas → `max_iterations`
 *   - bootstrap LC1/LC2 adapters + LC6 verifiers into a real orchestrator
 *   - call `runDevBuilderForPlan`
 *   - persist the loop result on the builder row
 *
 * Auth: service-role only.
 */
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { requireServiceRole } from "../_shared/edge-auth.ts";
import { rejectQuerySecrets } from "../_shared/reject-query-secrets.ts";
import {
  type DevPlan,
  runDevBuilderForPlan,
} from "../_shared/execution/builders/dev-builder-runtime.ts";
import { createGithubFetchOthers } from "../_shared/execution/builders/github-fetch-others.ts";
import { preciseComputeCurrentChanges } from "../_shared/execution/builders/merge-conflict-recovery.ts";
import {
  ExecutionOrchestratorV2,
  type OrchestratorDeps,
} from "../_shared/execution/orchestrator-v2.ts";
import { globalAdapterRegistry } from "../_shared/execution/adapter-registry.ts";
import { taskVerificationService } from "../_shared/execution/verification-service.ts";
import { bootstrapCodeEditAdapter } from "../_shared/execution/adapters/code/bootstrap.ts";
import { bootstrapBuildAdapters } from "../_shared/execution/adapters/build/bootstrap.ts";
import { bootstrapTestAdapters } from "../_shared/execution/adapters/test/bootstrap.ts";
import { SupabaseTaskRepository } from "../_shared/execution/persistence.ts";
import { InMemoryEventSink } from "../_shared/execution/canonical-events.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-trace-id, x-span-id, x-parent-span-id, x-request-id, traceparent",
};

const DEFAULT_MAX_ITERATIONS = 5;

interface BuilderTaskRow {
  id: string;
  type: string;
  payload: { plan?: DevPlan } & Record<string, unknown>;
}

const ALLOWED_BUILDER_TYPES = new Set([
  "EXECUTE_DEV_PLAN",
  "EXECUTE.DEV.PLAN",
]);

interface AgentRow {
  quotas: { max_iterations?: number } | null;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

let bootstrapped = false;
async function ensureBootstrapped(): Promise<void> {
  if (bootstrapped) return;
  // Best-effort bootstrap. Failures here are surfaced at task execution
  // time as NO_ADAPTER from the orchestrator, with a clear blocked_reason.
  try {
    await bootstrapCodeEditAdapter({ registry: globalAdapterRegistry });
  } catch (e) {
    console.warn("[dev-builder] code adapter bootstrap failed:", e);
  }
  try {
    await bootstrapBuildAdapters({ registry: globalAdapterRegistry });
  } catch (e) {
    console.warn("[dev-builder] build adapter bootstrap failed:", e);
  }
  try {
    await bootstrapTestAdapters({ registry: globalAdapterRegistry });
  } catch (e) {
    console.warn("[dev-builder] test adapter bootstrap failed:", e);
  }
  bootstrapped = true;
}

Deno.serve(async (req) => {
  const __qs = rejectQuerySecrets(req);
  if (__qs.rejected) return __qs.response!;
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  const auth = requireServiceRole(req);
  if (!auth.authorized) return auth.response!;

  let body: { builder_task_id?: string; plan_task_id?: string };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "invalid_json" }, 400);
  }
  // `plan_task_id` accepted as a deprecated alias.
  const builderTaskId = body.builder_task_id ?? body.plan_task_id;
  if (!builderTaskId || typeof builderTaskId !== "string") {
    return jsonResponse({ error: "builder_task_id_required" }, 400);
  }

  await ensureBootstrapped();

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const githubToken = Deno.env.get("GITHUB_RUNNER_PAT") ??
    Deno.env.get("GITHUB_TOKEN") ?? "";
  const githubRepo = Deno.env.get("GITHUB_RUNNER_REPO") ??
    Deno.env.get("GITHUB_REPO") ?? "";
  const githubBase = Deno.env.get("GITHUB_RUNNER_REF") ?? "main";
  const sb = createClient(supabaseUrl, serviceKey);

  // Load the builder task row. MUST be type EXECUTE_DEV_PLAN — the
  // same identity is used for `parent_task_id` linking on every child
  // step row and as `p_builder_task_id` on `system.request_dev_replan`,
  // so the type contract has to be enforced at the entry point too.
  const { data: builderRow, error: loadErr } = await sb
    .schema("system")
    .from("execution_tasks")
    .select("id, type, payload")
    .eq("id", builderTaskId)
    .maybeSingle<BuilderTaskRow>();
  if (loadErr) return jsonResponse({ error: loadErr.message }, 500);
  if (!builderRow) return jsonResponse({ error: "task_not_found" }, 404);
  if (!ALLOWED_BUILDER_TYPES.has(String(builderRow.type).toUpperCase())) {
    return jsonResponse(
      { error: "task_not_execute_dev_plan", actual_type: builderRow.type },
      422,
    );
  }

  const plan = builderRow.payload?.plan;
  if (!plan || !Array.isArray(plan.steps)) {
    return jsonResponse({ error: "plan_missing_or_invalid" }, 422);
  }

  // Source-of-truth for the loop bound is the dev.builder agent's
  // `quotas.max_iterations`. No request-body override is honoured —
  // operators change the bound by updating the agent row, which is what
  // makes "bounded by quotas.max_iterations" auditable.
  const { data: agentRow } = await sb
    .schema("system")
    .from("agents")
    .select("quotas")
    .eq("slug", "dev.builder")
    .maybeSingle<AgentRow>();
  const maxIterations = agentRow?.quotas?.max_iterations ??
    DEFAULT_MAX_ITERATIONS;

  if (!githubToken || !githubRepo) {
    return jsonResponse({ error: "github_credentials_missing" }, 500);
  }

  const orchestratorDeps: OrchestratorDeps = {
    repository: new SupabaseTaskRepository(sb),
    registry: globalAdapterRegistry,
    locks: {
      acquire: async () => true,
      release: async () => true,
      withLock: async (_k, _o, _t, fn) =>
        ({ acquired: true as const, value: await fn() }),
    },
    idempotency: {
      findExistingResult: async () => null,
      writeResult: async () => undefined,
    },
    sink: new InMemoryEventSink(),
    validator: { validate: async () => ({ ok: true as const }) },
    ownerId: "dev.builder",
    verification: taskVerificationService,
  };
  const orchestrator = new ExecutionOrchestratorV2(orchestratorDeps);

  const headBranch = `agent-task-${builderRow.id}`;
  // Conservative branch-cut bound: any commit landed on the merge base
  // since the request entered the dev-builder is treated as a potential
  // conflict. The drift detector only blocks on hard hunk overlap, so
  // an over-wide window is safe.
  const branchCutAt = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const loopResult = await runDevBuilderForPlan({
    sb,
    orchestrator,
    builderTaskId: builderRow.id,
    initialPlan: plan,
    maxIterations,
    // LC4 #924 — wire merge-conflict recovery into the production loop
    // so a hard overlap detected on the merge step automatically drives
    // the builder to a rev-2 plan via `request_dev_replan`.
    merge: {
      fetchOthers: createGithubFetchOthers({
        pat: githubToken,
        repo: githubRepo,
        currentBranch: headBranch,
        branchCutAt,
        defaultBranch: githubBase,
      }),
      // #939 — derive precise per-hunk new-side line ranges from the
      // code.edit adapter result so the drift gate only fires on
      // actual line overlap, not "same file touched anywhere". This
      // matches the precision of the GitHub-side comparison set
      // produced by `createGithubFetchOthers`.
      computeCurrentChanges: preciseComputeCurrentChanges,
    },
    github: {
      pat: githubToken,
      repo: githubRepo,
      baseBranch: githubBase,
      headBranch,
    },
  });

  // Best-effort persistence of the final loop result on the builder row.
  // Re-read the row immediately before the update so we don't clobber
  // fields written by `request_dev_replan` (e.g. `last_replan`) or by
  // any other writer during the loop. Loop is bounded but can run for
  // many seconds, so the stale-overwrite window is real.
  const { data: latestRow } = await sb
    .schema("system")
    .from("execution_tasks")
    .select("payload")
    .eq("id", builderRow.id)
    .maybeSingle<{ payload: Record<string, unknown> | null }>();
  const mergedPayload = {
    ...(latestRow?.payload ?? builderRow.payload ?? {}),
    loop_result: loopResult,
  };
  await sb
    .schema("system")
    .from("execution_tasks")
    .update({ payload: mergedPayload })
    .eq("id", builderRow.id);

  return jsonResponse(loopResult);
});

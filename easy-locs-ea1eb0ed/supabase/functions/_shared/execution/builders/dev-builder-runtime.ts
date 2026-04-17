/**
 * LC4 — Dev Builder · production runtime wiring (task #878).
 *
 * Glue layer that binds the pure `runDevBuilderLoop` driver to the real
 * Level-C primitives:
 *
 *   - Step execution → `dispatch_execution_task` RPC (creates a child
 *     `execution_tasks` row whose `parent_task_id` is the builder row),
 *     then runs it through the injected orchestrator (LC1 / LC2).
 *   - Per-iteration verifier → reads the orchestration outcomes the
 *     orchestrator already produced (LC6 verifier-registry runs inside
 *     `ExecutionOrchestratorV2.run`). Aggregation rule: every step must
 *     have `finalStatus === "succeeded"`, and the last `test.run` step
 *     must report `verification.status === "verified"`.
 *   - Replan → `dispatch_lc3_replan` RPC + reload of the new plan from
 *     the resulting `execution_tasks` row.
 *   - PR open → `openGithubPullRequest` (Git Data API: branch + commit +
 *     PR), with the aggregated file state collected from the children's
 *     `code.edit` results.
 *
 * This module is dependency-injected end-to-end so the integration test
 * can drive the full builder without a real Supabase / GitHub / Deno
 * runtime; the thin Deno entry point at `supabase/functions/dev-builder/
 * index.ts` is the only place that wires real Supabase + GitHub clients.
 */

import {
  type DevPlan,
  type LoopChildTaskRecord,
  type LoopIterationRecord,
  type LoopResult,
  runDevBuilderLoop,
  type StepOutcome,
  type VerifierVerdict,
} from "./dev-builder-loop.ts";
import {
  type OpenPrFileChange,
  type OpenPrResult,
  openGithubPullRequest,
} from "./github-open-pr.ts";

/** Minimal subset of `OrchestrationOutcome` we depend on. The real
 *  type lives in `_shared/execution/orchestrator-v2.ts`; we accept any
 *  superset so the runtime stays Deno/Node-agnostic. */
export interface OrchestrationOutcomeLike {
  readonly taskId: string;
  readonly finalStatus: "succeeded" | "failed" | "blocked" | "running";
  readonly errorCode?: string;
  readonly errorMessage?: string;
  readonly verification?: { readonly status: "verified" | "rejected" | "skipped" };
  readonly result?: Record<string, unknown>;
}

/** Minimal orchestrator surface — `ExecutionOrchestratorV2` satisfies. */
export interface OrchestratorLike {
  run(taskId: string): Promise<OrchestrationOutcomeLike>;
}

/** Minimal Supabase surface used for child-task dispatch / replan. */
export interface SupabaseLike {
  // deno-lint-ignore no-explicit-any
  schema(name: string): any;
}

/** Result shape produced by the LC1 code.edit adapter (subset). The
 *  builder relies on `files[].path` + `files[].after` to build the
 *  GitHub commit. */
interface CodeEditAdapterResult {
  files?: Array<{ path: string; after?: string | null }>;
}

export interface RunDevBuilderForPlanOptions {
  readonly sb: SupabaseLike;
  readonly orchestrator: OrchestratorLike;
  readonly builderTaskId: string;
  readonly initialPlan: DevPlan;
  readonly maxIterations: number;
  /** Polling tick for the replan plan-ready wait. Default 1000ms. */
  readonly replanTickMs?: number;
  /** Hard cap on the replan plan-ready wait. Default 30000ms. */
  readonly replanWaitMs?: number;
  readonly github: {
    readonly pat: string;
    readonly repo: string;
    readonly baseBranch: string;
    readonly headBranch: string;
    readonly authorName?: string;
    readonly authorEmail?: string;
    readonly fetchImpl?: typeof fetch;
  };
}

const STEP_KIND_TO_TASK_TYPE: Record<
  "code.edit" | "build.run" | "test.run",
  string
> = {
  "code.edit": "code.edit",
  "build.run": "build.run",
  "test.run": "test.run",
};

const STEP_KIND_TO_DOMAIN: Record<
  "code.edit" | "build.run" | "test.run",
  string
> = {
  "code.edit": "code",
  "build.run": "build",
  "test.run": "test",
};

/** Aggregate the latest `after` content for every file touched by any
 *  succeeded `code.edit` step in the iteration history. Later iterations
 *  override earlier ones; `after === null` (or missing) means the file
 *  was not modified by that step. Files that end up with `after === null`
 *  are forwarded as deletes. */
export function aggregateFileChanges(
  iterations: readonly LoopIterationRecord[],
): OpenPrFileChange[] {
  const latest = new Map<string, string | null>();
  for (const it of iterations) {
    for (const child of it.children) {
      if (child.stepKind !== "code.edit") continue;
      if (child.outcome.status !== "succeeded") continue;
      const result = child.outcome.result as CodeEditAdapterResult | undefined;
      const files = result?.files;
      if (!Array.isArray(files)) continue;
      for (const f of files) {
        if (typeof f?.path !== "string" || f.path.length === 0) continue;
        const after =
          typeof f.after === "string" ? f.after : f.after === null ? null : undefined;
        if (after === undefined) continue; // unchanged
        latest.set(f.path, after);
      }
    }
  }
  return Array.from(latest.entries()).map(([path, content]) => ({ path, content }));
}

/** Render a Markdown PR body summarising the run. */
export function renderPrBody(
  builderTaskId: string,
  planId: string,
  iterations: readonly LoopIterationRecord[],
): string {
  const lines = [
    `Builder task: \`${builderTaskId}\``,
    `Plan: \`${planId}\``,
    `Iterations: ${iterations.length}`,
    "",
    "## Steps",
  ];
  for (const it of iterations) {
    lines.push(`### Iteration ${it.iteration} (plan rev ${it.planRevision})`);
    for (const c of it.children) {
      lines.push(
        `- \`${c.stepKind}\` (${c.stepId}) → **${c.outcome.status}** — child \`${c.childTaskId}\``,
      );
    }
    lines.push(`- verifier: **${it.verifier.status}**`);
  }
  return lines.join("\n");
}

/** Map an orchestration outcome to a `StepOutcome` the loop understands. */
function outcomeToStepOutcome(o: OrchestrationOutcomeLike): StepOutcome {
  if (o.finalStatus === "succeeded") {
    return { status: "succeeded", result: o.result ?? {} };
  }
  return {
    status: "failed",
    error: o.errorMessage ?? o.errorCode ?? `orchestrator_${o.finalStatus}`,
    result: o.result,
  };
}

/** Aggregate the per-step orchestration outcomes into the LC6-aligned
 *  iteration verdict. Rule:
 *    - any step that is not `succeeded` → red (transient).
 *    - any step whose verification was `rejected` → red (transient).
 *    - the last `test.run` step MUST exist and MUST be `verified`. */
export function deriveVerifierVerdict(
  stepResults: readonly LoopChildTaskRecord[],
  orchestrationByChild: ReadonlyMap<string, OrchestrationOutcomeLike>,
): VerifierVerdict {
  for (const s of stepResults) {
    if (s.outcome.status !== "succeeded") {
      return { status: "red", reason: `step_failed:${s.stepId}` };
    }
    const o = orchestrationByChild.get(s.childTaskId);
    if (o?.verification?.status === "rejected") {
      return { status: "red", reason: `verifier_rejected:${s.stepId}` };
    }
  }
  const lastTest = [...stepResults].reverse().find((s) => s.stepKind === "test.run");
  if (!lastTest) {
    return { status: "red", reason: "no_test_step" };
  }
  const lastTestOutcome = orchestrationByChild.get(lastTest.childTaskId);
  if (lastTestOutcome?.verification?.status !== "verified") {
    return { status: "red", reason: "tests_not_verified" };
  }
  return { status: "green" };
}

/** Run the full LC4 dev builder for one plan. Returns the loop result
 *  augmented with `pr_result` when a PR was opened. */
export async function runDevBuilderForPlan(
  opts: RunDevBuilderForPlanOptions,
): Promise<LoopResult & { pr_result?: OpenPrResult }> {
  const { sb, orchestrator, builderTaskId, initialPlan, maxIterations, github } = opts;
  const orchestrationByChild = new Map<string, OrchestrationOutcomeLike>();
  let lastPrResult: OpenPrResult | undefined;

  const result = await runDevBuilderLoop({
    builderTaskId,
    initialPlan,
    maxIterations,

    dispatchChildTask: async ({ builderTaskId: parentId, step }) => {
      const taskType = STEP_KIND_TO_TASK_TYPE[step.kind];
      const domain = STEP_KIND_TO_DOMAIN[step.kind];
      const { data, error } = await sb.schema("system").rpc(
        "dispatch_execution_task",
        {
          p_type: taskType,
          p_domain: domain,
          p_risk_level: "MEDIUM",
          p_status: "queued",
          p_payload: step.payload,
          p_requested_by: "dev.builder",
          p_parent_task_id: parentId,
          p_max_attempts: 1,
          p_approval_policy: "none",
          p_requires_approval: false,
        },
      );
      if (error) throw new Error(`dispatch_child_failed: ${error.message}`);
      const row = data as { id?: string } | null;
      if (!row?.id) throw new Error("dispatch_child_failed: no id returned");
      return row.id;
    },

    runStep: async ({ childTaskId }) => {
      const outcome = await orchestrator.run(childTaskId);
      orchestrationByChild.set(childTaskId, outcome);
      return outcomeToStepOutcome(outcome);
    },

    runVerifier: async ({ stepResults }) =>
      deriveVerifierVerdict(stepResults, orchestrationByChild),

    requestReplan: async ({ builderTaskId: bid, verifier }) => {
      // Canonical dev-builder replan path (LC4 #878). NOT the LC7
      // dispatch_lc3_replan RPC, which is gated on BLOCKED_BY_DRIFT
      // and owned by the drift-detector pipeline.
      const { data, error } = await sb.schema("system").rpc(
        "request_dev_replan",
        { p_builder_task_id: bid, p_reason: verifier.reason },
      );
      if (error) return null;
      const replanTaskId = (data as { replan_task_id?: string } | null)
        ?.replan_task_id;
      if (!replanTaskId) return null;

      // Wait for LC3 to populate `payload.plan` on the replan row.
      // Production: LC3 is dispatched immediately by the runner pool;
      // we bound the wait at `replanWaitMs` (default 30s, 1s tick).
      const tickMs = opts.replanTickMs ?? 1000;
      const maxWaitMs = opts.replanWaitMs ?? 30_000;
      const deadline = Date.now() + maxWaitMs;
      while (Date.now() <= deadline) {
        const { data: row } = await sb
          .schema("system")
          .from("execution_tasks")
          .select("payload, status")
          .eq("id", replanTaskId)
          .maybeSingle();
        const plan = (row as { payload?: { plan?: DevPlan } } | null)
          ?.payload?.plan;
        if (plan && Array.isArray(plan.steps)) return plan;
        const status = (row as { status?: string } | null)?.status;
        if (status === "failed" || status === "blocked") return null;
        if (Date.now() + tickMs > deadline) break;
        await new Promise((r) => setTimeout(r, tickMs));
      }
      return null;
    },

    openPullRequest: async ({ builderTaskId: bid, planId, iterations }) => {
      const files = aggregateFileChanges(iterations);
      const pr = await openGithubPullRequest({
        pat: github.pat,
        repo: github.repo,
        baseBranch: github.baseBranch,
        headBranch: github.headBranch,
        title: `[dev.builder] ${planId} (${iterations.length} iter)`,
        body: renderPrBody(bid, planId, iterations),
        commitMessage: `dev.builder: ${planId} (${iterations.length} iter)`,
        authorName: github.authorName ?? "dev.builder",
        authorEmail: github.authorEmail ?? "dev-builder@platform.local",
        files,
        fetchImpl: github.fetchImpl,
      });
      lastPrResult = pr;
      return { number: pr.number, url: pr.url };
    },
  });

  return lastPrResult ? { ...result, pr_result: lastPrResult } : result;
}

export type { DevPlan } from "./dev-builder-loop.ts";

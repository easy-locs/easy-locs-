/**
 * LC4 — Dev Builder · loop driver (task #878).
 *
 * The dev builder is the Level-C agent that consumes a plan produced by
 * LC3 and executes it in a bounded loop:
 *
 *   for each step in plan:        run via LC1 (code.edit) / LC2 (build/test) adapter
 *   after all steps:              run LC6 verifier
 *     if green                  → open PR (success terminal)
 *     if rejected (transient)   → request LC3 replan, refresh plan, loop
 *     if rejected (permanent)   → terminal failure
 *   bounded by quotas.max_iterations
 *
 * Strict invariants:
 *   - The builder NEVER writes code itself; every code mutation goes through
 *     the injected `runStep` callback (which is wired to the LC1 / LC2
 *     adapters in production).
 *   - The builder NEVER runs build/test directly; same `runStep` contract.
 *   - Each plan step gets one child `execution_tasks` row (parent =
 *     the builder's own task row) via the injected `dispatchChildTask`
 *     callback. The control plane (LB1 / register_agent / dispatch RPC)
 *     remains the single source of truth for governance.
 *   - Opening a PR is conditioned on `verifier.status === "green"`. A
 *     red verifier MUST trigger replan, never a PR.
 *   - The loop terminates when (a) tests are green and the PR is opened,
 *     (b) the verifier returns a permanent reject, or (c) the iteration
 *     budget (`maxIterations`) is exhausted — whichever comes first.
 *
 * This module is dependency-injected end-to-end so the vitest integration
 * test can drive the full loop without a real Supabase / GitHub / Deno
 * runtime. The thin Deno entry point at `supabase/functions/dev-builder/
 * index.ts` is the only place that wires real Supabase + GitHub clients.
 */

/** A single step in a plan. `kind` maps 1:1 to a Level-C primitive:
 *   - "code.edit" → LC1 code-edit adapter
 *   - "build.run" → LC2 build adapter
 *   - "test.run"  → LC2 test adapter
 *  `payload` is forwarded verbatim to the adapter. */
export interface DevPlanStep {
  readonly id: string;
  readonly kind: "code.edit" | "build.run" | "test.run";
  readonly payload: Record<string, unknown>;
}

export interface DevPlan {
  readonly plan_id: string;
  readonly goal: string;
  readonly steps: readonly DevPlanStep[];
  /** Monotonic revision; LC3 bumps this on every replan. */
  readonly revision?: number;
}

export type StepOutcome =
  | { status: "succeeded"; result: Record<string, unknown> }
  | { status: "failed"; error: string; result?: Record<string, unknown> };

/** Verifier verdict. `permanent` means LC6 has determined the plan
 *  cannot be salvaged by replan (e.g. impossible task type). */
export type VerifierVerdict =
  | { status: "green" }
  | { status: "red"; reason: string; permanent?: boolean };

export type LoopTerminalStatus =
  | "merged"
  | "rejected_permanent"
  | "rejected_quota_exhausted"
  | "rejected_replan_failed";

export interface LoopChildTaskRecord {
  readonly iteration: number;
  readonly stepId: string;
  readonly stepKind: DevPlanStep["kind"];
  readonly childTaskId: string;
  readonly outcome: StepOutcome;
}

export interface LoopIterationRecord {
  readonly iteration: number;
  readonly planRevision: number;
  readonly children: readonly LoopChildTaskRecord[];
  readonly verifier: VerifierVerdict;
}

export interface LoopResult {
  readonly status: LoopTerminalStatus;
  readonly iterations: readonly LoopIterationRecord[];
  readonly pr?: { readonly number: number; readonly url: string };
  readonly reason?: string;
}

/** Caller-supplied callback that materialises a child execution_tasks
 *  row for a single plan step. Production wires this to the SECURITY
 *  DEFINER `system.dispatch_execution_task` RPC with `p_parent_task_id`
 *  set to the builder task id. Returns the new child task id. */
export type DispatchChildTaskFn = (args: {
  builderTaskId: string;
  planId: string;
  iteration: number;
  step: DevPlanStep;
}) => Promise<string>;

/** Caller-supplied callback that runs a single plan step via the
 *  appropriate Level-C adapter (LC1 for code.edit, LC2 for build.run /
 *  test.run). The builder MUST NOT mutate code or run shell commands
 *  itself — this is the single seam for that. */
export type RunStepFn = (args: {
  childTaskId: string;
  step: DevPlanStep;
}) => Promise<StepOutcome>;

/** Caller-supplied callback that runs the LC6 verifier on the
 *  aggregated state at the end of an iteration. */
export type RunVerifierFn = (args: {
  builderTaskId: string;
  planId: string;
  iteration: number;
  stepResults: readonly LoopChildTaskRecord[];
}) => Promise<VerifierVerdict>;

/** Caller-supplied callback invoked when the verifier returned `red`
 *  (and not permanent). Must request a fresh plan from LC3 and resolve
 *  to the replanned `DevPlan` (with bumped revision). Throwing or
 *  resolving to `null` aborts the loop with `rejected_replan_failed`. */
export type RequestReplanFn = (args: {
  builderTaskId: string;
  previousPlan: DevPlan;
  verifier: Extract<VerifierVerdict, { status: "red" }>;
  iteration: number;
}) => Promise<DevPlan | null>;

/** Caller-supplied callback that opens a PR on GitHub once the verifier
 *  has gone green. Production wires this to the GitHub REST API. */
export type OpenPullRequestFn = (args: {
  builderTaskId: string;
  planId: string;
  iterations: readonly LoopIterationRecord[];
}) => Promise<{ number: number; url: string }>;

/** Pre-merge verdict surfaced by the LC7 drift detector. A `drift_conflict`
 *  means another dev task touched the same hunk(s) on a parallel branch
 *  (or merged into main since this branch was cut) — the iteration MUST
 *  NOT open a PR; instead the loop converts it into a transient verifier
 *  red and triggers `request_dev_replan` with the carried reason. */
export type PreMergeVerdict =
  | { status: "ok" }
  | { status: "drift_conflict"; reason: string };

/** Caller-supplied callback that runs the LC7 pre-merge drift hook AFTER
 *  the verifier has gone green and BEFORE the PR is opened. Defaults to
 *  `{ status: "ok" }` when not provided (single-task / no-conflict mode). */
export type PreMergeCheckFn = (args: {
  builderTaskId: string;
  planId: string;
  iteration: number;
  iterations: readonly LoopIterationRecord[];
}) => Promise<PreMergeVerdict>;

export interface RunDevBuilderLoopOptions {
  readonly builderTaskId: string;
  readonly initialPlan: DevPlan;
  /** Hard upper bound on iterations (one full plan-walk + verifier per
   *  iteration). Sourced in production from
   *  `system.agents.quotas.max_iterations` for the `dev.builder` agent.
   *  Must be >= 1; values <= 0 are clamped to 1. */
  readonly maxIterations: number;
  readonly dispatchChildTask: DispatchChildTaskFn;
  readonly runStep: RunStepFn;
  readonly runVerifier: RunVerifierFn;
  readonly requestReplan: RequestReplanFn;
  readonly openPullRequest: OpenPullRequestFn;
  /** Optional LC7 pre-merge drift hook. When omitted, every iteration
   *  proceeds straight to PR open (single-task / no-conflict mode). */
  readonly preMergeCheck?: PreMergeCheckFn;
}

/** Canonical LC4 loop. Order of operations is fixed and MUST NOT be
 *  reordered:
 *
 *   1. For each step in the current plan:
 *      a. Dispatch a child execution_tasks row (parent = builder).
 *      b. Run the step via the adapter callback.
 *      c. If the step failed → the iteration ends early with whatever
 *         step results we collected so far; the verifier is still given
 *         the chance to classify (typically as `red`).
 *   2. Run the verifier on the aggregated step results.
 *   3. If `green` → open the PR and terminate `merged`.
 *      If `red` and `permanent` → terminate `rejected_permanent`.
 *      If `red` and not permanent → call requestReplan; if it returns a
 *      new plan, loop with that plan; if it returns null / throws,
 *      terminate `rejected_replan_failed`.
 *   4. If iteration budget is exhausted, terminate `rejected_quota_exhausted`. */
export async function runDevBuilderLoop(
  opts: RunDevBuilderLoopOptions,
): Promise<LoopResult> {
  const maxIterations = Math.max(1, Math.floor(opts.maxIterations));
  const iterations: LoopIterationRecord[] = [];
  let plan: DevPlan = opts.initialPlan;

  for (let i = 1; i <= maxIterations; i++) {
    const children: LoopChildTaskRecord[] = [];

    for (const step of plan.steps) {
      const childTaskId = await opts.dispatchChildTask({
        builderTaskId: opts.builderTaskId,
        planId: plan.plan_id,
        iteration: i,
        step,
      });
      const outcome = await opts.runStep({ childTaskId, step });
      children.push({
        iteration: i,
        stepId: step.id,
        stepKind: step.kind,
        childTaskId,
        outcome,
      });
      if (outcome.status === "failed") {
        // Stop walking the plan; let the verifier judge what we have.
        break;
      }
    }

    const verifier = await opts.runVerifier({
      builderTaskId: opts.builderTaskId,
      planId: plan.plan_id,
      iteration: i,
      stepResults: children,
    });

    // If the verifier is green AND a pre-merge hook is wired, consult
    // the LC7 drift detector BEFORE opening the PR. A `drift_conflict`
    // means another dev task touched overlapping hunks on a parallel
    // branch (or merged into main since this branch was cut). We MUST
    // NOT open the PR in that case; instead we convert the verdict into
    // a transient verifier red so the existing replan path fires with a
    // truthful, auditable reason.
    let effectiveVerifier: VerifierVerdict = verifier;
    if (verifier.status === "green" && opts.preMergeCheck) {
      const preMerge = await opts.preMergeCheck({
        builderTaskId: opts.builderTaskId,
        planId: plan.plan_id,
        iteration: i,
        iterations: [
          ...iterations,
          { iteration: i, planRevision: plan.revision ?? 0, children, verifier },
        ],
      });
      if (preMerge.status === "drift_conflict") {
        effectiveVerifier = {
          status: "red",
          reason: `merge_conflict:${preMerge.reason}`,
        };
      }
    }

    iterations.push({
      iteration: i,
      planRevision: plan.revision ?? 0,
      children,
      verifier: effectiveVerifier,
    });

    if (effectiveVerifier.status === "green") {
      const pr = await opts.openPullRequest({
        builderTaskId: opts.builderTaskId,
        planId: plan.plan_id,
        iterations,
      });
      return { status: "merged", iterations, pr };
    }

    if (effectiveVerifier.status === "red" && effectiveVerifier.permanent) {
      return {
        status: "rejected_permanent",
        iterations,
        reason: effectiveVerifier.reason,
      };
    }

    if (i === maxIterations) {
      return {
        status: "rejected_quota_exhausted",
        iterations,
        reason: `max_iterations=${maxIterations} exhausted`,
      };
    }

    if (effectiveVerifier.status !== "red") {
      // Defensive: only reachable if a future code path produced an
      // unexpected verdict; we treat it as a non-replan terminal.
      return {
        status: "rejected_replan_failed",
        iterations,
        reason: `unexpected_verdict:${effectiveVerifier.status}`,
      };
    }

    let nextPlan: DevPlan | null;
    try {
      nextPlan = await opts.requestReplan({
        builderTaskId: opts.builderTaskId,
        previousPlan: plan,
        verifier: effectiveVerifier,
        iteration: i,
      });
    } catch (err) {
      return {
        status: "rejected_replan_failed",
        iterations,
        reason: err instanceof Error ? err.message : String(err),
      };
    }
    if (!nextPlan) {
      return {
        status: "rejected_replan_failed",
        iterations,
        reason: "requestReplan returned null",
      };
    }
    plan = nextPlan;
  }

  // Defensive — the for-loop above always returns within its body.
  return {
    status: "rejected_quota_exhausted",
    iterations,
    reason: `max_iterations=${maxIterations} exhausted (defensive)`,
  };
}

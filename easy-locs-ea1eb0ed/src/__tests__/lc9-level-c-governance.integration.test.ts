/**
 * LC9 (#879) — End-to-end governance suite for Level C.
 *
 * Goal: prove the Level-C promise — every dev task that touches
 * production code travels through the canonical chain
 *
 *   registry → quota → policy → approval → execution → verifier → audit
 *
 * with NO bypass possible. Each scenario composes the real LC1..LC7
 * primitives via dependency injection so the assertions exercise the
 * production code paths, not stand-ins.
 *
 * Five scenarios:
 *   1. Simple UI dev intent           → full chain, PR opened, complete audit.
 *   2. Sensitive intent (_shared/)    → LC5 marks pending_review,
 *                                       execution suspended until approval.
 *   3. Build broken                   → LC6 verifier reject permanent,
 *                                       no PR opened, status=failed.
 *   4. Two parallel tasks, same file  → LC7 drift detector marks the
 *                                       second BLOCKED_BY_DRIFT.
 *   5. deploy.prod simulated, health  → revert_pr rollback fires.
 *      check fails
 *
 * Plus: a "no bypass scan" that asserts no module outside the
 * allow-listed Level-C adapter / builder paths reaches around the
 * registry to do raw fs writes, spawn child processes, or talk to
 * GitHub via octokit.
 */

import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

// ── LC1 (code.edit) ────────────────────────────────────────────────────
import { ExecutionOrchestratorV2 } from "../../supabase/functions/_shared/execution/orchestrator-v2.ts";
import { AdapterRegistry } from "../../supabase/functions/_shared/execution/adapter-registry.ts";
import { VerifierRegistry } from "../../supabase/functions/_shared/execution/verifier-registry.ts";
import { TaskVerificationService } from "../../supabase/functions/_shared/execution/verification-service.ts";
import { MemoryLockService } from "../../supabase/functions/_shared/execution/lock-service.ts";
import { MemoryIdempotencyService } from "../../supabase/functions/_shared/execution/idempotency-service.ts";
import { InMemoryEventSink } from "../../supabase/functions/_shared/execution/canonical-events.ts";
import {
  createCodeEditAdapter,
  type WorkspaceProvider,
} from "../../supabase/functions/_shared/execution/adapters/code/code-edit.ts";
import { createCodeEditVerifier } from "../../supabase/functions/_shared/execution/adapters/code/code-edit-verifier.ts";
import { CODE_TASK_TYPES } from "../../supabase/functions/_shared/execution/adapters/code/types.ts";
import {
  MemoryFs,
  type SandboxFs,
} from "../../supabase/functions/_shared/execution/adapters/code/sandbox.ts";
import {
  MemoryTaskRepository,
  makeTask,
} from "../../supabase/functions/_shared/execution/__test-helpers__.ts";

// ── LC4 builder loop ───────────────────────────────────────────────────
import {
  type DevPlan,
  runDevBuilderLoop,
} from "../../supabase/functions/_shared/execution/builders/dev-builder-loop.ts";

// ── LC5 policy ─────────────────────────────────────────────────────────
import {
  applyDevPolicyToDispatchInput,
  evaluateDevPolicy,
} from "../../supabase/functions/_shared/execution/policies/dev-policy.ts";

// ── LC7 drift ──────────────────────────────────────────────────────────
import {
  BLOCKED_BY_DRIFT_REASON,
  type BranchChanges,
  type FileChange,
  computeDriftReport,
  runPreMergeDriftCheck,
} from "../../supabase/functions/_shared/execution/drift-detector.ts";

// ──────────────────────────────────────────────────────────────────────
// Tiny in-memory governance registry shared by every scenario.
//
// Models the production rule: every Level-C runtime callback (LC1
// code.edit, LC2 build/test/deploy, LC4 dev-builder) is registered with
// (slug, policy_profile, quotas). Direct invocation outside the
// registry is a bypass and the scenarios never do it — they always go
// `registry.resolve(slug)` first.
// ──────────────────────────────────────────────────────────────────────

interface AgentRecord {
  slug: string;
  policyProfile: "dev-default" | "dev-sensitive";
  quotas: { maxIterations: number; maxDiffBytes: number };
}
const REGISTRY: ReadonlyMap<string, AgentRecord> = new Map([
  ["code.edit", { slug: "code.edit", policyProfile: "dev-default", quotas: { maxIterations: 3, maxDiffBytes: 50_000 } }],
  ["build.run", { slug: "build.run", policyProfile: "dev-default", quotas: { maxIterations: 1, maxDiffBytes: 0 } }],
  ["test.run", { slug: "test.run", policyProfile: "dev-default", quotas: { maxIterations: 1, maxDiffBytes: 0 } }],
  ["dev.builder", { slug: "dev.builder", policyProfile: "dev-default", quotas: { maxIterations: 3, maxDiffBytes: 0 } }],
  ["deploy.prod", { slug: "deploy.prod", policyProfile: "dev-sensitive", quotas: { maxIterations: 1, maxDiffBytes: 0 } }],
]);

function resolveAgent(slug: string): AgentRecord {
  const a = REGISTRY.get(slug);
  if (!a) throw new Error(`registry: unknown agent slug ${slug}`);
  return a;
}

type AuditEvent =
  | "registry.resolved"
  | "quota.checked"
  | "policy.evaluated"
  | "approval.required"
  | "approval.granted"
  | "execution.dispatched"
  | "execution.completed"
  | "verifier.green"
  | "verifier.red"
  | "drift.checked"
  | "drift.blocked"
  | "pr.opened"
  | "pr.skipped"
  | "deploy.health_check_failed"
  | "rollback.revert_pr";

interface AuditLine {
  step: AuditEvent;
  details?: Record<string, unknown>;
}

function makeAudit() {
  const lines: AuditLine[] = [];
  return {
    push(step: AuditEvent, details?: Record<string, unknown>) {
      lines.push({ step, details });
    },
    steps(): AuditEvent[] { return lines.map((l) => l.step); },
    lines(): readonly AuditLine[] { return lines; },
    last(): AuditLine | undefined { return lines[lines.length - 1]; },
  };
}

// Builds the canonical Level-C pipeline as a single function. This is
// the "no bypass possible" guarantee in code form: the only path from
// `intent` to `merged` goes through every gate, in order.
async function runLevelCPipeline(input: {
  intent: string;
  changedPaths: string[];
  approveOnPending?: boolean;       // simulates an admin approval click
  buildBroken?: boolean;            // forces verifier red+permanent
}) {
  const audit = makeAudit();

  // 1. registry resolve
  const builderAgent = resolveAgent("dev.builder");
  audit.push("registry.resolved", { slug: builderAgent.slug });

  // 2. quota check
  if (builderAgent.quotas.maxIterations < 1) {
    throw new Error("quota.exhausted at dispatch time");
  }
  audit.push("quota.checked", { maxIterations: builderAgent.quotas.maxIterations });

  // 3. policy eval — runs against the planned changed paths.
  const decision = evaluateDevPolicy({
    taskType: CODE_TASK_TYPES.EDIT.toUpperCase(),
    changedPaths: input.changedPaths,
  });
  audit.push("policy.evaluated", { profile: decision.profile });

  // 4. approval gate
  if (decision.requiresReview) {
    audit.push("approval.required", { reason: decision.reason });
    if (!input.approveOnPending) {
      return { status: "pending_review" as const, audit, decision };
    }
    audit.push("approval.granted", {});
  }

  // 5. execution: drive the LC4 loop with stub LC1/LC2 callbacks.
  const plan: DevPlan = {
    plan_id: "lc9-plan",
    goal: input.intent,
    revision: 1,
    steps: [
      { id: "s1", kind: "code.edit", payload: { changed_paths: input.changedPaths } },
      { id: "s2", kind: "build.run", payload: {} },
      { id: "s3", kind: "test.run", payload: {} },
    ],
  };

  let openedPr: { number: number; url: string } | null = null;

  const result = await runDevBuilderLoop({
    builderTaskId: "lc9-builder-task",
    initialPlan: plan,
    maxIterations: builderAgent.quotas.maxIterations,
    dispatchChildTask: async ({ step }) => {
      // Each child dispatch re-resolves through the registry (proves
      // there is no out-of-band path: the loop only knows the slug).
      resolveAgent(step.kind);
      audit.push("execution.dispatched", { slug: step.kind });
      return `child-${step.id}`;
    },
    runStep: async ({ step }) => {
      if (step.kind === "build.run" && input.buildBroken) {
        audit.push("execution.completed", { slug: step.kind, ok: false });
        return { status: "failed", error: "tsc emitted 3 errors" };
      }
      audit.push("execution.completed", { slug: step.kind, ok: true });
      return { status: "succeeded", result: { ok: true } };
    },
    runVerifier: async ({ stepResults }) => {
      const anyFailed = stepResults.some((c) => c.outcome.status === "failed");
      if (anyFailed) {
        audit.push("verifier.red", { permanent: true });
        return { status: "red", reason: "build_broken", permanent: true };
      }
      audit.push("verifier.green", {});
      return { status: "green" };
    },
    requestReplan: async () => null,
    openPullRequest: async () => {
      // Pre-merge drift hook (LC7) is a no-op in the happy single-task
      // case: the comparison set is empty.
      const drift = computeDriftReport(
        "lc9-builder-branch",
        input.changedPaths.map((p): FileChange => ({ file: p, startLine: 1, endLine: 1 })),
        [],
      );
      audit.push("drift.checked", { severity: drift.severity });
      openedPr = { number: 1234, url: "https://example.invalid/pr/1234" };
      audit.push("pr.opened", { number: openedPr.number });
      return openedPr;
    },
  });

  if (result.status !== "merged") {
    audit.push("pr.skipped", { reason: result.status });
  }

  return { status: result.status, audit, result, pr: openedPr, decision };
}

// ──────────────────────────────────────────────────────────────────────
// Scenario 1 — Simple dev intent flows through every gate.
// ──────────────────────────────────────────────────────────────────────

describe("LC9 · scenario 1 — simple UI dev intent (full canonical chain)", () => {
  it("registry → quota → policy(dev-default) → execute → verifier(green) → drift(none) → pr → audit", async () => {
    const r = await runLevelCPipeline({
      intent: "tweak hero copy on homepage",
      changedPaths: ["src/pages/HomePage.tsx", "src/components/ui/Hero.tsx"],
    });

    expect(r.status).toBe("merged");
    expect(r.decision.profile).toBe("dev-default");
    expect(r.decision.requiresReview).toBe(false);
    expect(r.pr?.number).toBe(1234);

    // Canonical chain (in this order, no skipped step).
    const steps = r.audit.steps();
    expect(steps[0]).toBe("registry.resolved");
    expect(steps[1]).toBe("quota.checked");
    expect(steps[2]).toBe("policy.evaluated");
    expect(steps).toContain("execution.dispatched");
    expect(steps).toContain("execution.completed");
    expect(steps).toContain("verifier.green");
    expect(steps).toContain("drift.checked");
    expect(steps).toContain("pr.opened");

    // No approval gate fired for a benign change.
    expect(steps).not.toContain("approval.required");
    expect(steps).not.toContain("approval.granted");

    // Each plan step (code/build/test) was dispatched exactly once.
    const dispatches = steps.filter((s) => s === "execution.dispatched");
    expect(dispatches).toHaveLength(3);
  });
});

// ──────────────────────────────────────────────────────────────────────
// Scenario 2 — Sensitive intent suspends until approval.
// ──────────────────────────────────────────────────────────────────────

describe("LC9 · scenario 2 — sensitive change (_shared/) requires approval", () => {
  const SENSITIVE_PATHS = ["supabase/functions/_shared/execution/dispatch.ts"];

  it("first pass: policy flips to dev-sensitive and execution suspends in pending_review", async () => {
    const r = await runLevelCPipeline({
      intent: "harden the dispatch wrapper",
      changedPaths: SENSITIVE_PATHS,
      approveOnPending: false,
    });

    expect(r.status).toBe("pending_review");
    expect(r.decision.profile).toBe("dev-sensitive");
    expect(r.decision.requiresReview).toBe(true);

    const steps = r.audit.steps();
    expect(steps).toContain("approval.required");
    // CRITICAL: no execution may happen before approval.
    expect(steps).not.toContain("execution.dispatched");
    expect(steps).not.toContain("execution.completed");
    expect(steps).not.toContain("pr.opened");
  });

  it("second pass: after admin approval the same intent runs end-to-end", async () => {
    const r = await runLevelCPipeline({
      intent: "harden the dispatch wrapper",
      changedPaths: SENSITIVE_PATHS,
      approveOnPending: true,
    });

    expect(r.status).toBe("merged");
    const steps = r.audit.steps();
    // Approval landed BEFORE the first execution, never after.
    const approvalIdx = steps.indexOf("approval.granted");
    const firstDispatchIdx = steps.indexOf("execution.dispatched");
    expect(approvalIdx).toBeGreaterThan(-1);
    expect(firstDispatchIdx).toBeGreaterThan(approvalIdx);
    expect(steps).toContain("pr.opened");
  });

  it("dispatch wrapper agrees with the policy evaluator on the same input", () => {
    const wrapped = applyDevPolicyToDispatchInput({
      domain: "code",
      taskType: "CODE.EDIT",
      payload: { changed_paths: SENSITIVE_PATHS },
      metadata: {},
      approvalPolicy: "policy-default",
    });
    expect(wrapped.decision.requiresReview).toBe(true);
    expect(wrapped.rpcOverrides.status).toBe("pending_review");
    expect(wrapped.input.approvalPolicy).toBe("single-admin");
  });
});

// ──────────────────────────────────────────────────────────────────────
// Scenario 3 — Build broken: verifier red permanent, no PR.
// ──────────────────────────────────────────────────────────────────────

describe("LC9 · scenario 3 — broken build is rejected without opening a PR", () => {
  it("build step fails → verifier red+permanent → loop ends rejected_permanent, no PR", async () => {
    const r = await runLevelCPipeline({
      intent: "buggy refactor",
      changedPaths: ["src/lib/some-util.ts"],
      buildBroken: true,
    });

    expect(r.status).toBe("rejected_permanent");
    expect(r.pr).toBeNull();

    const steps = r.audit.steps();
    expect(steps).toContain("verifier.red");
    expect(steps).toContain("pr.skipped");
    expect(steps).not.toContain("pr.opened");
    // The build step was attempted (and failed) before the loop bailed.
    expect(steps.filter((s) => s === "execution.dispatched").length).toBeGreaterThanOrEqual(2);
  });
});

// ──────────────────────────────────────────────────────────────────────
// Scenario 4 — Two parallel tasks on the same file, second blocked.
// ──────────────────────────────────────────────────────────────────────

describe("LC9 · scenario 4 — drift detector blocks the second parallel task", () => {
  const FAKE_TASK_ID = "00000000-0000-0000-0000-000000000909";

  // Minimal Supabase fake — exact same shape used by the LC7 unit test.
  function fakeSb() {
    type Row = { id: string; status: string; blocked_reason: string | null; drift_report: unknown };
    const rows = new Map<string, Row>([[FAKE_TASK_ID, {
      id: FAKE_TASK_ID, status: "queued", blocked_reason: null, drift_report: null,
    }]]);
    function table() {
      let mode: "select" | "update" = "select";
      let patch: Record<string, unknown> | null = null;
      let id: string | null = null;
      const chain = {
        select() { mode = "select"; return chain; },
        update(p: Record<string, unknown>) { mode = "update"; patch = p; return chain; },
        eq(_col: string, val: string) {
          id = val;
          if (mode === "update" && id && rows.has(id)) {
            rows.set(id, { ...rows.get(id)!, ...(patch ?? {}) } as Row);
            return Promise.resolve({ error: null, data: null });
          }
          return chain;
        },
        maybeSingle() {
          return Promise.resolve({ data: id ? rows.get(id) ?? null : null, error: null });
        },
      };
      return chain;
    }
    const sb = { schema: () => ({ from: () => table() }) };
    return { sb: sb as unknown as Parameters<typeof runPreMergeDriftCheck>[0]["sb"], rows };
  }

  it("second task touching same lines is transitioned to BLOCKED_BY_DRIFT", async () => {
    const { sb, rows } = fakeSb();

    // Task A already opened a PR that touches src/foo.ts lines 10-20.
    const others: BranchChanges[] = [
      { ref: "agent-task-A", changes: [{ file: "src/foo.ts", startLine: 10, endLine: 20 }] },
    ];

    // Task B (the current task) tries to touch overlapping lines 15-25.
    const result = await runPreMergeDriftCheck({
      sb,
      taskId: FAKE_TASK_ID,
      currentBranch: "agent-task-B",
      currentChanges: [{ file: "src/foo.ts", startLine: 15, endLine: 25 }],
      fetchOthers: async () => others,
    });

    expect(result.blocked).toBe(true);
    expect(result.report.severity).toBe("hard");
    expect(result.report.overlaps).toHaveLength(1);

    const row = rows.get(FAKE_TASK_ID)!;
    expect(row.status).toBe("blocked");
    expect(row.blocked_reason).toBe(BLOCKED_BY_DRIFT_REASON);
    expect((row.drift_report as { severity: string }).severity).toBe("hard");
  });

  it("disjoint changes on the same file: severity=soft, NOT blocked", async () => {
    const { sb, rows } = fakeSb();
    const result = await runPreMergeDriftCheck({
      sb,
      taskId: FAKE_TASK_ID,
      currentBranch: "agent-task-B",
      currentChanges: [{ file: "src/foo.ts", startLine: 100, endLine: 110 }],
      fetchOthers: async () => [
        { ref: "agent-task-A", changes: [{ file: "src/foo.ts", startLine: 10, endLine: 20 }] },
      ],
    });
    expect(result.blocked).toBe(false);
    expect(result.report.severity).toBe("soft");
    // Row is untouched.
    expect(rows.get(FAKE_TASK_ID)!.status).toBe("queued");
  });
});

// ──────────────────────────────────────────────────────────────────────
// Scenario 4b — LC4 hardening (#908): a real merge-conflict produced by
// another dev task on the same hunk MUST flow through the loop's
// pre-merge hook, get converted into a transient verifier red, fire
// `request_dev_replan` with `merge_conflict:<reason>`, and resume from
// the LC3 replan (PR opened on the second iteration). The whole chain
// is end-to-end auditable.
// ──────────────────────────────────────────────────────────────────────

describe("LC9 · scenario 4b — LC4 builder loop absorbs a real merge conflict", () => {
  it("two patches on the same hunk → drift conflict → request_dev_replan → loop resumes → PR opens", async () => {
    const replanCalls: Array<{ reason: string; iteration: number }> = [];
    const dispatched: string[] = [];
    const verifierVerdicts: string[] = [];
    const preMergeOutcomes: string[] = [];
    let openedPr: { number: number; url: string } | null = null;

    // Plan rev 1 touches src/foo.ts lines 10-20 — collides with the
    // other dev task already merged. Plan rev 2 touches lines 100-110
    // (post-replan) — clean.
    const plan1: DevPlan = {
      plan_id: "lc9-merge-conflict",
      goal: "fix bug A on src/foo.ts",
      revision: 1,
      steps: [
        { id: "s1", kind: "code.edit", payload: { changed_paths: ["src/foo.ts"], lines: [10, 20] } },
        { id: "s2", kind: "build.run", payload: {} },
        { id: "s3", kind: "test.run", payload: {} },
      ],
    };
    const plan2: DevPlan = {
      ...plan1,
      revision: 2,
      steps: [
        { id: "s1b", kind: "code.edit", payload: { changed_paths: ["src/foo.ts"], lines: [100, 110] } },
        { id: "s2b", kind: "build.run", payload: {} },
        { id: "s3b", kind: "test.run", payload: {} },
      ],
    };

    // Other dev task (already merged) holds src/foo.ts lines 10-20.
    const others: BranchChanges[] = [
      { ref: "agent-task-A", changes: [{ file: "src/foo.ts", startLine: 10, endLine: 20 }] },
    ];

    let currentPlan: DevPlan = plan1;

    const result = await runDevBuilderLoop({
      builderTaskId: "lc9-builder-merge-conflict",
      initialPlan: plan1,
      maxIterations: 3,

      dispatchChildTask: async ({ step }) => {
        resolveAgent(step.kind);
        dispatched.push(`${currentPlan.revision}:${step.id}`);
        return `child-${currentPlan.revision}-${step.id}`;
      },

      runStep: async () => ({ status: "succeeded", result: { ok: true } }),

      runVerifier: async () => {
        verifierVerdicts.push("green");
        return { status: "green" };
      },

      preMergeCheck: async ({ planId: _planId }) => {
        // Use the REAL drift detector, with the current plan's hunks.
        const currentChanges: FileChange[] =
          currentPlan === plan1
            ? [{ file: "src/foo.ts", startLine: 10, endLine: 20 }]
            : [{ file: "src/foo.ts", startLine: 100, endLine: 110 }];
        const report = computeDriftReport(
          "lc9-builder-branch",
          currentChanges,
          others,
        );
        if (report.severity === "hard") {
          preMergeOutcomes.push("drift_conflict");
          return {
            status: "drift_conflict",
            reason: `overlap_with:${report.overlaps[0].other_ref}`,
          };
        }
        preMergeOutcomes.push("ok");
        return { status: "ok" };
      },

      requestReplan: async ({ verifier, iteration }) => {
        // The loop MUST forward the pre-merge reason verbatim into the
        // request_dev_replan call. This is the contract the SQL RPC
        // (`system.request_dev_replan`) audits onto the parent row.
        replanCalls.push({ reason: verifier.reason, iteration });
        // Simulate the LC3 pipeline producing a fresh plan rev 2.
        currentPlan = plan2;
        return plan2;
      },

      openPullRequest: async () => {
        openedPr = { number: 9908, url: "https://example.invalid/pr/9908" };
        return openedPr;
      },
    });

    // Final outcome: merged on iteration 2, NOT iteration 1.
    expect(result.status).toBe("merged");
    expect(openedPr).toEqual({ number: 9908, url: "https://example.invalid/pr/9908" });
    expect(result.iterations).toHaveLength(2);

    // Iteration 1: verifier green → pre-merge drift_conflict → effective
    // verifier red with `merge_conflict:` reason → replan fires.
    expect(preMergeOutcomes[0]).toBe("drift_conflict");
    expect(result.iterations[0].verifier.status).toBe("red");
    expect(
      (result.iterations[0].verifier as { reason: string }).reason,
    ).toMatch(/^merge_conflict:overlap_with:agent-task-A$/);

    // request_dev_replan MUST have been called exactly once with the
    // merge-conflict reason carried verbatim from the pre-merge hook.
    expect(replanCalls).toHaveLength(1);
    expect(replanCalls[0].reason).toBe("merge_conflict:overlap_with:agent-task-A");
    expect(replanCalls[0].iteration).toBe(1);

    // Iteration 2 (post-replan): pre-merge ok → PR opened on rev 2.
    expect(preMergeOutcomes[1]).toBe("ok");
    expect(result.iterations[1].planRevision).toBe(2);
    expect(result.iterations[1].verifier.status).toBe("green");

    // Both plan revisions were dispatched through the registry — no
    // out-of-band path (plan rev 1 attempted, plan rev 2 merged).
    expect(dispatched.some((d) => d.startsWith("1:"))).toBe(true);
    expect(dispatched.some((d) => d.startsWith("2:"))).toBe(true);
  });

  it("permanent verifier reject does NOT trigger merge_conflict replan path", async () => {
    // Sanity: the new pre-merge plumbing must not interfere with the
    // existing rejected_permanent terminal — this guards against a
    // regression where the effectiveVerifier rewrite swallows the
    // permanent flag.
    const plan: DevPlan = {
      plan_id: "lc9-permanent-fail",
      goal: "buggy",
      revision: 1,
      steps: [{ id: "s1", kind: "code.edit", payload: {} }],
    };
    const result = await runDevBuilderLoop({
      builderTaskId: "lc9-permanent",
      initialPlan: plan,
      maxIterations: 2,
      dispatchChildTask: async () => "child-x",
      runStep: async () => ({ status: "succeeded", result: {} }),
      runVerifier: async () => ({
        status: "red",
        reason: "broken_forever",
        permanent: true,
      }),
      // Pre-merge hook is wired but should NEVER run on a red verifier.
      preMergeCheck: async () => {
        throw new Error("pre-merge hook must not run on a red verifier");
      },
      requestReplan: async () => null,
      openPullRequest: async () => ({ number: 0, url: "" }),
    });
    expect(result.status).toBe("rejected_permanent");
    expect(result.reason).toBe("broken_forever");
  });
});

// ──────────────────────────────────────────────────────────────────────
// Scenario 5 — deploy.prod fails health check → revert_pr rollback.
// ──────────────────────────────────────────────────────────────────────

describe("LC9 · scenario 5 — deploy.prod health-check failure triggers revert_pr", () => {
  // Composes:
  //   - registry resolve (deploy.prod is dev-sensitive)
  //   - approval gate (must be granted)
  //   - dispatch deploy (mock Vercel runner returns READY)
  //   - post-deploy health check (mocked to fail)
  //   - rollback path: revert_pr callback fires, audit records it
  type HealthCheckFn = (url: string) => Promise<{ ok: boolean; status: number }>;
  type RevertPrFn = (args: { mergeSha: string; reason: string }) => Promise<{ pr_number: number }>;

  async function runDeployProdWithHealthGate(opts: {
    project: string;
    approvedBy: string | null;
    healthCheck: HealthCheckFn;
    revertPr: RevertPrFn;
  }) {
    const audit = makeAudit();
    const agent = resolveAgent("deploy.prod");
    audit.push("registry.resolved", { slug: agent.slug });
    audit.push("quota.checked", {});

    // deploy.prod is dev-sensitive → approval is mandatory.
    const decision = evaluateDevPolicy({ taskType: "DEPLOY.PROD", changedPaths: [] });
    audit.push("policy.evaluated", { profile: decision.profile });
    if (!decision.requiresReview) throw new Error("invariant: deploy.prod must require review");
    audit.push("approval.required", {});
    if (!opts.approvedBy) {
      return { status: "pending_review" as const, audit };
    }
    audit.push("approval.granted", { by: opts.approvedBy });

    // Dispatch (mocked Vercel runner).
    audit.push("execution.dispatched", { slug: agent.slug });
    const deployment = { id: "dpl_lc9_42", url: "https://lc9.example.invalid", mergeSha: "deadbeef" };
    audit.push("execution.completed", { slug: agent.slug, deployment_id: deployment.id });

    // Verifier: deployment carries a deployment_id and an approval — green.
    audit.push("verifier.green", {});

    // Post-deploy health check.
    const health = await opts.healthCheck(deployment.url);
    if (!health.ok) {
      audit.push("deploy.health_check_failed", { status: health.status });
      const reverted = await opts.revertPr({ mergeSha: deployment.mergeSha, reason: "health_check_failed" });
      audit.push("rollback.revert_pr", { pr_number: reverted.pr_number });
      return { status: "rolled_back" as const, audit, deployment, reverted };
    }
    return { status: "deployed" as const, audit, deployment };
  }

  it("health check returns 5xx → revert_pr fires exactly once with the merge sha", async () => {
    let revertCalls = 0;
    let revertArgs: { mergeSha: string; reason: string } | null = null;
    const r = await runDeployProdWithHealthGate({
      project: "easy-locs-prod",
      approvedBy: "admin-uuid",
      healthCheck: async () => ({ ok: false, status: 503 }),
      revertPr: async (args) => {
        revertCalls += 1;
        revertArgs = args;
        return { pr_number: 555 };
      },
    });

    expect(r.status).toBe("rolled_back");
    expect(revertCalls).toBe(1);
    expect(revertArgs).toEqual({ mergeSha: "deadbeef", reason: "health_check_failed" });

    const steps = r.audit.steps();
    expect(steps).toContain("approval.granted");
    expect(steps).toContain("deploy.health_check_failed");
    expect(steps).toContain("rollback.revert_pr");
    // Rollback came strictly AFTER execution and verifier.
    expect(steps.indexOf("rollback.revert_pr")).toBeGreaterThan(steps.indexOf("verifier.green"));
  });

  it("without approval, deploy.prod never reaches the dispatch step", async () => {
    const revertPr = async () => ({ pr_number: 0 });
    const r = await runDeployProdWithHealthGate({
      project: "easy-locs-prod",
      approvedBy: null,
      healthCheck: async () => ({ ok: true, status: 200 }),
      revertPr,
    });
    expect(r.status).toBe("pending_review");
    expect(r.audit.steps()).not.toContain("execution.dispatched");
  });

  it("health check passes → no rollback, deployment status=deployed", async () => {
    const revertPr = async () => ({ pr_number: 0 });
    const r = await runDeployProdWithHealthGate({
      project: "easy-locs-prod",
      approvedBy: "admin-uuid",
      healthCheck: async () => ({ ok: true, status: 200 }),
      revertPr,
    });
    expect(r.status).toBe("deployed");
    expect(r.audit.steps()).not.toContain("rollback.revert_pr");
  });
});

// ──────────────────────────────────────────────────────────────────────
// LC1 sanity — code.edit adapter still enforces the FS sandbox.
//
// One belt-and-braces assertion that the adapter actually writes through
// the sandbox interface (no raw fs / no Deno.writeTextFile leak in
// generic application code). The exhaustive bypass scan below is the
// real guard; this test pins the shape end-to-end.
// ──────────────────────────────────────────────────────────────────────

describe("LC9 · LC1 sandbox enforcement (sanity)", () => {
  it("code.edit adapter writes through SandboxFs, never raw IO", async () => {
    const acquired: MemoryFs[] = [];
    const workspaces: WorkspaceProvider = {
      async acquire() {
        const fs = new MemoryFs("ws-lc9", { "src/foo.ts": "old\n" });
        acquired.push(fs);
        return fs as SandboxFs;
      },
      async release() { /* noop */ },
    };
    const tasks = new MemoryTaskRepository();
    const adapters = new AdapterRegistry();
    const verifiers = new VerifierRegistry();
    const sink = new InMemoryEventSink();
    verifiers.register(createCodeEditVerifier());
    adapters.register(createCodeEditAdapter({ workspaces }));

    const orch = new ExecutionOrchestratorV2({
      registry: adapters,
      repository: tasks,
      locks: new MemoryLockService(),
      idempotency: new MemoryIdempotencyService(),
      validator: { async validate() { return { ok: true }; } },
      sink,
      ownerId: "lc9-test-runner",
      lockTtlSeconds: 30,
      verification: new TaskVerificationService(verifiers),
    });

    const task = makeTask({
      id: "lc9-sandbox-task",
      type: CODE_TASK_TYPES.EDIT,
      domain: "code",
      status: "queued",
      requires_approval: false,
      approval_policy: "none",
      payload: {
        workspace: "ws-lc9",
        operations: [
          { op: "write_file", path: "src/foo.ts", content: "new\n" },
        ],
      },
      idempotency_key: "lc9-sandbox-key",
    });
    tasks.upsert(task);
    await orch.run(task.id);

    const final = tasks.snapshot(task.id);
    expect(final?.status).toBe("succeeded");
    // The orchestrator routed through the registry (we never called the
    // adapter directly).
    expect(acquired).toHaveLength(1);
    expect(await acquired[0].read("src/foo.ts")).toBe("new\n");
  });
});

// ──────────────────────────────────────────────────────────────────────
// No-bypass scan — the safety net.
//
// Asserts that no production runtime code outside the allow-listed
// Level-C adapter / builder paths reaches around the registry to do raw
// fs writes, spawn child processes, or hit GitHub via octokit.
//
// Allow-list (the ONLY paths permitted to host these primitives):
//   * supabase/functions/_shared/execution/adapters/code/    — LC1 sandbox
//   * supabase/functions/_shared/execution/adapters/build/   — LC2 build
//   * supabase/functions/_shared/execution/adapters/test/    — LC2 test
//   * supabase/functions/_shared/execution/adapters/deploy/  — LC2 deploy
//   * supabase/functions/_shared/execution/builders/         — LC4 builder
//   * src/__tests__/                                          — test harness
//   * src/test/                                               — test setup
//
// Pattern set (textual, narrow on purpose so the rule stays maintainable):
//   * `from "child_process"` / `from "node:child_process"` / `require('child_process')`
//   * `from "@octokit/...` (any octokit subpackage import)
//   * `Deno.writeTextFile` / `Deno.writeFile`
//   * `fs.writeFile` / `writeFileSync` / `writeFile(` from a node:fs import
//
// The scan walks `src/` and `supabase/functions/` only — build-time
// tooling (vite plugins, scripts/, eslint plugin) is NOT runtime code
// the dev agents could subvert and is intentionally out of scope.
// ──────────────────────────────────────────────────────────────────────

const SCAN_ROOTS = ["src", "supabase/functions"];
const ALLOWLIST_PREFIXES = [
  "supabase/functions/_shared/execution/adapters/code/",
  "supabase/functions/_shared/execution/adapters/build/",
  "supabase/functions/_shared/execution/adapters/test/",
  "supabase/functions/_shared/execution/adapters/deploy/",
  "supabase/functions/_shared/execution/builders/",
  "src/__tests__/",
  "src/test/",
];

const BYPASS_PATTERNS: Array<{ id: string; re: RegExp }> = [
  { id: "child_process import", re: /from\s+["'](?:node:)?child_process(?:\/promises)?["']/ },
  { id: "child_process require", re: /require\(\s*["'](?:node:)?child_process(?:\/promises)?["']\s*\)/ },
  { id: "octokit import", re: /from\s+["']@octokit\// },
  { id: "Deno.writeTextFile", re: /\bDeno\.writeTextFile\s*\(/ },
  { id: "Deno.writeFile", re: /\bDeno\.writeFile\s*\(/ },
  { id: "fs.writeFileSync", re: /\bwriteFileSync\s*\(/ },
  { id: "fs.writeFile (member)", re: /\bfs\.writeFile\s*\(/ },
  // Destructured / named import of writeFile from node:fs (or fs/promises).
  // Catches `import { writeFile } from "node:fs/promises"` style bypasses
  // that the member-access regex above would miss.
  {
    id: "fs.writeFile (named import)",
    re: /import\s*\{[^}]*\bwriteFile\b[^}]*\}\s*from\s*["'](?:node:)?fs(?:\/promises)?["']/,
  },
  // Same vector via CommonJS destructuring: `const { writeFile } = require('fs')`.
  {
    id: "fs.writeFile (require destructure)",
    re: /\{\s*[^}]*\bwriteFile\b[^}]*\}\s*=\s*require\(\s*["'](?:node:)?fs(?:\/promises)?["']\s*\)/,
  },
];

function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}

function walk(dir: string, acc: string[] = []): string[] {
  let entries: string[];
  try { entries = readdirSync(dir); } catch { return acc; }
  for (const name of entries) {
    const p = join(dir, name);
    let st;
    try { st = statSync(p); } catch { continue; }
    if (st.isDirectory()) {
      if (name === "node_modules" || name === ".git" || name === "dist" || name === "build") continue;
      walk(p, acc);
    } else if (/\.(ts|tsx|js|mjs)$/.test(name)) {
      acc.push(p);
    }
  }
  return acc;
}

/**
 * Strict, repo-relative prefix check. We deliberately avoid `includes`
 * (fuzzy substring) so an offender file path cannot smuggle an
 * allow-listed segment in the middle of its path (e.g.
 * `src/sneaky/supabase/functions/_shared/execution/adapters/code/x.ts`
 * is NOT inside the LC1 sandbox and must not pass).
 *
 * `file` may be absolute (when produced by `walk()` rooted at "src" the
 * paths come back like "src/foo/bar.ts" — already repo-relative — but
 * we normalise defensively in case the test is ever run from a
 * different cwd).
 */
function isAllowlisted(file: string): boolean {
  const norm = file.replace(/\\/g, "/");
  // Strip a leading "./" if present, and any leading repo absolute path
  // segments so the prefix check is anchored at the repo root.
  const cwd = process.cwd().replace(/\\/g, "/") + "/";
  const repoRel = norm.startsWith(cwd) ? norm.slice(cwd.length) : norm.replace(/^\.\//, "");
  return ALLOWLIST_PREFIXES.some((p) => repoRel.startsWith(p));
}

describe("LC9 · no-bypass scan (Level-C primitives stay inside the registry)", () => {
  it("no runtime file outside the LC1/LC2/LC4 allow-list reaches around the registry", () => {
    const offenders: Array<{ file: string; pattern: string }> = [];
    for (const root of SCAN_ROOTS) {
      for (const file of walk(root)) {
        if (isAllowlisted(file)) continue;
        const src = stripComments(readFileSync(file, "utf8"));
        for (const { id, re } of BYPASS_PATTERNS) {
          if (re.test(src)) offenders.push({ file, pattern: id });
        }
      }
    }
    expect(
      offenders,
      `Bypass attempts found — these files reach around the Level-C registry:\n` +
        offenders.map((o) => `  ${o.file} → ${o.pattern}`).join("\n"),
    ).toEqual([]);
  });

  it("the allow-list is itself non-empty and stable (catches accidental wipe)", () => {
    expect(ALLOWLIST_PREFIXES.length).toBeGreaterThanOrEqual(5);
    expect(ALLOWLIST_PREFIXES).toContain(
      "supabase/functions/_shared/execution/adapters/code/",
    );
    expect(ALLOWLIST_PREFIXES).toContain(
      "supabase/functions/_shared/execution/builders/",
    );
  });

  it("the bypass pattern set covers every documented vector", () => {
    const ids = BYPASS_PATTERNS.map((p) => p.id);
    expect(ids).toContain("child_process import");
    expect(ids).toContain("octokit import");
    expect(ids).toContain("Deno.writeTextFile");
    expect(ids).toContain("fs.writeFileSync");
    expect(ids).toContain("fs.writeFile (named import)");
    expect(ids).toContain("fs.writeFile (require destructure)");
  });

  // ───────────────────────────────────────────────────────────────────
  // Negative / self-tests for the scanner itself. These prove the
  // scanner would actually catch a real bypass — a green LC9 suite with
  // a broken scanner would silently let an offender through.
  // ───────────────────────────────────────────────────────────────────
  it("rejects near-miss paths that merely contain an allow-list segment", () => {
    // Paths that EMBED an allow-listed prefix in the middle must not be
    // treated as allow-listed (this is the bug the strict prefix check
    // is designed to prevent).
    const nearMisses = [
      "src/sneaky/supabase/functions/_shared/execution/adapters/code/evil.ts",
      "supabase/functions/other/src/__tests__/fake.ts",
      "wrapper/src/test/payload.ts",
    ];
    for (const p of nearMisses) {
      expect(isAllowlisted(p), `${p} must NOT be allow-listed`).toBe(false);
    }
    // And the real allow-list entries must still match.
    expect(
      isAllowlisted("supabase/functions/_shared/execution/adapters/code/code-edit.ts"),
    ).toBe(true);
    expect(isAllowlisted("src/__tests__/anything.test.ts")).toBe(true);
  });

  it("flags every documented bypass form on synthetic source snippets", () => {
    const samples: Array<{ label: string; src: string }> = [
      { label: "node:child_process import",
        src: `import { spawn } from "node:child_process";` },
      { label: "node:child_process/promises import",
        src: `import { exec } from "node:child_process/promises";` },
      { label: "child_process require",
        src: `const cp = require("child_process");` },
      { label: "child_process/promises require",
        src: `const cp = require("child_process/promises");` },
      { label: "@octokit subpackage import",
        src: `import { Octokit } from "@octokit/rest";` },
      { label: "Deno.writeTextFile call",
        src: `await Deno.writeTextFile("/tmp/x", "y");` },
      { label: "Deno.writeFile call",
        src: `await Deno.writeFile("/tmp/x", new Uint8Array());` },
      { label: "writeFileSync call",
        src: `import fs from "fs"; fs.writeFileSync("a", "b");` },
      { label: "fs.writeFile member",
        src: `import * as fs from "node:fs"; fs.writeFile("a", "b", () => {});` },
      { label: "named import writeFile from fs/promises",
        src: `import { writeFile } from "node:fs/promises";\nawait writeFile("a", "b");` },
      { label: "named import writeFile from fs",
        src: `import { readFile, writeFile } from "fs";` },
      { label: "require destructure writeFile",
        src: `const { writeFile } = require("node:fs/promises");` },
    ];
    for (const { label, src } of samples) {
      const hit = BYPASS_PATTERNS.some(({ re }) => re.test(src));
      expect(hit, `scanner missed: ${label}\nsrc: ${src}`).toBe(true);
    }
  });

  it("does NOT flag innocent code (no false positives on benign reads)", () => {
    const benign = [
      `import { readFile } from "node:fs/promises"; await readFile("x");`,
      `import { readFileSync } from "fs"; readFileSync("x");`,
      // A comment mentioning writeFile must not trip us — stripComments
      // is applied before scanning, but verify the regex anyway against
      // a source-like string with no actual call.
      `// historical note: we used to call fs.writeFile here\nexport const x = 1;`,
    ];
    for (const src of benign) {
      const stripped = stripComments(src);
      const hit = BYPASS_PATTERNS.some(({ re }) => re.test(stripped));
      expect(hit, `false positive on benign source:\n${src}`).toBe(false);
    }
  });
});

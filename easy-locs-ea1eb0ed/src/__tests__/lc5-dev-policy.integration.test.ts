/**
 * LC5 (#873) — Approval policy for code changes.
 *
 * Pins down the dev-policy hook against the contract documented in
 * `.local/tasks/task-873.md`:
 *
 *   * `dev-default`   — auto-approve, no human review.
 *   * `dev-sensitive` — pending_review when ANY of:
 *       (a) a changed path matches `supabase/functions/_shared/`
 *       (b) a changed path matches `supabase/migrations/*.sql`
 *       (c) a changed path matches an RLS policy file
 *       (d) the task type is `DEPLOY.PROD`
 *
 * The hook is the single source of truth for the rule list (the SQL
 * migration mirrors it for audit only). This test enforces both the
 * pure evaluator AND the dispatch-input wrapper that the Deno-side
 * `dispatchExecutionTask` calls before invoking the canonical RPC.
 */

import { describe, expect, it } from "vitest";

import {
  DEV_SENSITIVE_PATH_RULES,
  DEV_SENSITIVE_TASK_TYPES,
  applyDevPolicyToDispatchInput,
  evaluateDevPolicy,
} from "../../supabase/functions/_shared/execution/policies/dev-policy.ts";

describe("LC5 — evaluateDevPolicy (pure path/task-type matcher)", () => {
  it("dev-default for benign UI / docs / test changes", () => {
    const out = evaluateDevPolicy({
      taskType: "CODE.EDIT",
      changedPaths: [
        "src/components/ui/button.tsx",
        "src/pages/HomePage.tsx",
        "docs/readme.md",
        "src/__tests__/example.test.ts",
      ],
    });
    expect(out.profile).toBe("dev-default");
    expect(out.requiresReview).toBe(false);
    expect(out.matches).toEqual([]);
    expect(out.reason).toBeNull();
  });

  it("flags a change under supabase/functions/_shared/", () => {
    const out = evaluateDevPolicy({
      taskType: "CODE.EDIT",
      changedPaths: ["supabase/functions/_shared/execution/dispatch.ts"],
    });
    expect(out.profile).toBe("dev-sensitive");
    expect(out.requiresReview).toBe(true);
    expect(out.matches.map((m) => m.ruleId)).toContain(
      "shared-edge-functions",
    );
    expect(out.reason).toMatch(/^DEV_SENSITIVE: /);
  });

  it("flags a SQL migration file", () => {
    const out = evaluateDevPolicy({
      taskType: "CODE.EDIT",
      changedPaths: ["supabase/migrations/20260430000000_dev_policies.sql"],
    });
    expect(out.requiresReview).toBe(true);
    expect(out.matches.map((m) => m.ruleId)).toContain("sql-migrations");
  });

  it("flags an RLS policy file by filename", () => {
    const out = evaluateDevPolicy({
      taskType: "CODE.EDIT",
      changedPaths: [
        "supabase/migrations/20260413400000_fix_rls_security_policies.sql",
        "src/lib/auth/rls-helpers.ts",
      ],
    });
    expect(out.requiresReview).toBe(true);
    const ids = out.matches.map((m) => m.ruleId);
    // The migration matches both `sql-migrations` and `rls-policies`,
    // and the helper file matches `rls-policies`.
    expect(ids).toContain("rls-policies");
  });

  it("flags DEPLOY.PROD task type even with no changed paths", () => {
    const out = evaluateDevPolicy({
      taskType: "DEPLOY.PROD",
      changedPaths: [],
    });
    expect(out.requiresReview).toBe(true);
    expect(out.matches[0].kind).toBe("task_type");
    expect(out.matches[0].ruleId).toBe("sensitive-task-type");
  });

  it("normalises leading ./ and slashes before matching", () => {
    const out = evaluateDevPolicy({
      taskType: "CODE.EDIT",
      changedPaths: ["./supabase/functions/_shared/policies/dev-policy.ts"],
    });
    expect(out.requiresReview).toBe(true);
  });

  it("ignores non-string entries gracefully", () => {
    const out = evaluateDevPolicy({
      taskType: "CODE.EDIT",
      // @ts-expect-error — runtime test of defensive filter
      changedPaths: [null, undefined, 42, ""],
    });
    expect(out.requiresReview).toBe(false);
  });

  it("exports a single, deduped rule list (no duplicate ids)", () => {
    const ids = DEV_SENSITIVE_PATH_RULES.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(DEV_SENSITIVE_TASK_TYPES.has("DEPLOY.PROD")).toBe(true);
  });
});

describe("LC5 — applyDevPolicyToDispatchInput (dispatch wrapper hook)", () => {
  it("is a no-op for any domain other than 'code'", () => {
    const original = {
      domain: "marketplace",
      taskType: "MARKETPLACE.LISTING.PUBLISH",
      payload: {
        changed_paths: ["supabase/functions/_shared/execution/dispatch.ts"],
      },
      metadata: {},
      approvalPolicy: "policy-default",
    };
    const result = applyDevPolicyToDispatchInput(original);
    expect(result.input).toBe(original);
    expect(result.decision.requiresReview).toBe(false);
    expect(result.rpcOverrides).toEqual({});
  });

  it("returns the input unchanged for code tasks with no sensitive paths", () => {
    const result = applyDevPolicyToDispatchInput({
      domain: "code",
      taskType: "CODE.EDIT",
      payload: { changed_paths: ["src/components/ui/button.tsx"] },
      metadata: {},
      approvalPolicy: "policy-default",
    });
    expect(result.decision.requiresReview).toBe(false);
    expect(result.input.approvalPolicy).toBe("policy-default");
    expect(result.input.payload?.dev_sensitive).toBeUndefined();
    expect(result.rpcOverrides).toEqual({});
  });

  it("enriches a sensitive code.edit and emits the pending_review overrides", () => {
    const result = applyDevPolicyToDispatchInput({
      domain: "code",
      taskType: "CODE.EDIT",
      payload: {
        diff_kind: "text",
        unified_diff: "--- a/x\n+++ b/x\n",
        changed_paths: [
          "supabase/functions/_shared/execution/dispatch.ts",
          "src/components/ui/button.tsx",
        ],
      },
      metadata: { initiator: "builder-agent" },
      approvalPolicy: "policy-default",
    });

    expect(result.decision.requiresReview).toBe(true);
    expect(result.decision.profile).toBe("dev-sensitive");
    expect(result.input.approvalPolicy).toBe("single-admin");

    // Payload retains the original diff fields and gains a dev_sensitive
    // summary the inbox drawer renders as "Fichiers sensibles touchés".
    const payload = result.input.payload as Record<string, unknown>;
    expect(payload.unified_diff).toBe("--- a/x\n+++ b/x\n");
    expect(payload.dev_sensitive).toBeDefined();
    const summary = payload.dev_sensitive as Record<string, unknown>;
    expect(summary.profile).toBe("dev-sensitive");
    expect(summary.matched_paths).toEqual([
      "supabase/functions/_shared/execution/dispatch.ts",
    ]);
    expect(summary.rules).toContain("shared-edge-functions");

    // Metadata is mirrored so callers that key off `task.metadata` (audit
    // tooling) see the same record without parsing the payload.
    const meta = result.input.metadata as Record<string, unknown>;
    expect(meta.dev_sensitive).toEqual(payload.dev_sensitive);
    expect(meta.initiator).toBe("builder-agent");

    // RPC overrides — the dispatch wrapper forwards these to the SQL
    // function so the row is created in `pending_review`.
    expect(result.rpcOverrides.requiresApproval).toBe(true);
    expect(result.rpcOverrides.status).toBe("pending_review");
    expect(result.rpcOverrides.blockedReason).toMatch(/^DEV_SENSITIVE/);
  });

  it("flips deploy.prod into pending_review even with no changed paths", () => {
    const result = applyDevPolicyToDispatchInput({
      domain: "code",
      taskType: "DEPLOY.PROD",
      payload: {},
      metadata: {},
      approvalPolicy: "policy-default",
    });
    expect(result.decision.requiresReview).toBe(true);
    expect(result.input.approvalPolicy).toBe("single-admin");
    expect(result.rpcOverrides.requiresApproval).toBe(true);
  });
});

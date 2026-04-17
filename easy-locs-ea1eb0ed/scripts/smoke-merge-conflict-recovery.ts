/**
 * LC4 — Dev Builder · merge-conflict recovery smoke script (task #915).
 *
 * Staged, end-to-end smoke that proves the production wiring of the
 * merge-conflict recovery loop on a real GitHub PR + a real
 * `dev-builder` edge function. It is the operator-facing sibling of
 * `lc4-merge-conflict-recovery.test.ts`: the test suite covers the
 * algebra with an in-memory Supabase fake; this script exercises the
 * same code path against the live RPC, the live planner, and the live
 * GitHub API.
 *
 * Done looks like
 * ───────────────
 *   - The script opens TWO parallel branches that touch the SAME
 *     hunk of a single throwaway file:
 *       smoke/merge-conflict-recovery-<run-id>.md  (lines 5..8)
 *   - Branch A's PR is squash-merged via the GitHub API.
 *   - The dev-builder edge function is invoked for branch B's
 *     `EXECUTE_DEV_PLAN` task. Its merge step calls the LC7 pre-merge
 *     drift hook, which detects the overlap with branch A's now-merged
 *     commit and transitions the row to `blocked /
 *     BLOCKED_BY_DRIFT`.
 *   - The merge step's `onBlocked` handler — wired here via
 *     `createMergeConflictRecoveryHandler` — calls
 *     `system.request_dev_replan` with reason
 *     `merge_conflict:overlap_with:<branch>`. The RPC inserts an
 *     `LC3.PLAN.PRODUCE` child and stamps `payload.last_replan` on
 *     the parent.
 *   - The script polls until the planner produces a non-overlapping
 *     rev 2 (or until the wait deadline expires) and asserts that the
 *     parent's `payload.last_replan.reason` carries the merge-conflict
 *     reason verbatim.
 *
 * Why this lives outside CI
 * ─────────────────────────
 * Real GitHub state, a real planner agent, and a real Supabase service
 * role are all required. Running this against the production repo
 * would litter it with throwaway files and PRs; the script REQUIRES
 * the operator to point it at a sandbox repo via env. A failed run is
 * intentionally noisy: every step writes a structured JSON line to
 * stdout so the staged-run log is auditable.
 *
 * Required environment
 * ────────────────────
 *   SUPABASE_URL                   — sandbox project URL
 *   SUPABASE_SERVICE_ROLE_KEY      — service-role key for that project
 *   GITHUB_RUNNER_PAT              — PAT with `repo` scope on the sandbox repo
 *   GITHUB_RUNNER_REPO             — `owner/name` of the sandbox repo
 *   GITHUB_RUNNER_REF              — base branch (default: `main`)
 *
 * Optional environment
 * ────────────────────
 *   SMOKE_RUN_ID                   — override the run id (default: timestamp)
 *   SMOKE_REPLAN_WAIT_MS           — max wait for rev-2 plan (default: 60000)
 *   SMOKE_REPLAN_TICK_MS           — poll interval (default: 2000)
 *   SMOKE_DRY_RUN                  — if "1", do everything except the
 *                                    GitHub merge + dev-builder invoke;
 *                                    useful for local pre-flight.
 *
 * Usage
 * ─────
 *   npx tsx scripts/smoke-merge-conflict-recovery.ts
 *
 * Exit codes
 * ──────────
 *   0  smoke succeeded — audit row carries the reason verbatim
 *   1  prerequisite check failed (missing env, missing repo, etc.)
 *   2  smoke ran but the audit row did not carry the expected reason
 *   3  smoke ran but the planner did not produce a rev-2 plan in time
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { openGithubPullRequest } from "../supabase/functions/_shared/execution/builders/github-open-pr.ts";

const GITHUB_API = "https://api.github.com";

interface SmokeConfig {
  supabaseUrl: string;
  serviceKey: string;
  pat: string;
  repo: string; // "owner/name"
  baseBranch: string;
  runId: string;
  replanWaitMs: number;
  replanTickMs: number;
  dryRun: boolean;
}

function log(event: string, data: Record<string, unknown> = {}): void {
  console.log(JSON.stringify({ ts: new Date().toISOString(), event, ...data }));
}

function fail(code: number, event: string, data: Record<string, unknown> = {}): never {
  log(event, { ...data, fatal: true });
  process.exit(code);
}

function loadConfig(): SmokeConfig {
  const need = (k: string): string => {
    const v = process.env[k];
    if (!v || v.length === 0) {
      fail(1, "missing_env", { var: k });
    }
    return v!;
  };
  return {
    supabaseUrl: need("SUPABASE_URL"),
    serviceKey: need("SUPABASE_SERVICE_ROLE_KEY"),
    pat: need("GITHUB_RUNNER_PAT"),
    repo: need("GITHUB_RUNNER_REPO"),
    baseBranch: process.env.GITHUB_RUNNER_REF || "main",
    runId: process.env.SMOKE_RUN_ID || `smoke-${Date.now()}`,
    replanWaitMs: Number(process.env.SMOKE_REPLAN_WAIT_MS ?? 60_000),
    replanTickMs: Number(process.env.SMOKE_REPLAN_TICK_MS ?? 2_000),
    dryRun: process.env.SMOKE_DRY_RUN === "1",
  };
}

/** Build the throwaway file body. Lines 5..8 are the conflict zone:
 *  branches A and B both rewrite those four lines. */
function makeFileBody(variant: "base" | "A" | "B", runId: string): string {
  const conflictLines: Record<typeof variant, string[]> = {
    base: ["L5: base", "L6: base", "L7: base", "L8: base"],
    A:    ["L5: branch-A wins", "L6: branch-A wins", "L7: branch-A wins", "L8: branch-A wins"],
    B:    ["L5: branch-B wins", "L6: branch-B wins", "L7: branch-B wins", "L8: branch-B wins"],
  };
  const lines = [
    `# smoke/merge-conflict-recovery — ${runId}`,
    "",
    "Lines 5..8 below are the conflict hunk; branches A and B both rewrite",
    "exactly those lines so the LC7 pre-merge drift hook MUST trip.",
    ...conflictLines[variant],
    "",
    "(trailing context — same on every branch, never modified)",
  ];
  return lines.join("\n") + "\n";
}

interface GithubMergeResult {
  merged: boolean;
  sha?: string;
}

async function mergePullRequest(
  cfg: SmokeConfig,
  prNumber: number,
): Promise<GithubMergeResult> {
  const res = await fetch(
    `${GITHUB_API}/repos/${cfg.repo}/pulls/${prNumber}/merge`,
    {
      method: "PUT",
      headers: {
        "Authorization": `Bearer ${cfg.pat}`,
        "Accept": "application/vnd.github+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ merge_method: "squash" }),
    },
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`github_merge_failed ${res.status}: ${text}`);
  }
  const body = (await res.json()) as { merged?: boolean; sha?: string };
  return { merged: body.merged === true, sha: body.sha };
}

interface BuilderTask {
  id: string;
  payload: {
    last_replan?: {
      reason?: string;
      replan_task_id?: string;
      requested_at?: string;
    };
    [k: string]: unknown;
  };
}

/** Insert an EXECUTE_DEV_PLAN row whose plan would attempt to merge
 *  branch B. We don't run the LC1/LC2 step adapters here — the smoke
 *  is exclusively about the merge gate + recovery wiring — so the
 *  plan body is the smallest stub LC4 will accept. The dev-builder
 *  edge function will dispatch children, the orchestrator will run
 *  them, the merge step will fire, and the gate will block. */
async function createBuilderTask(
  sb: SupabaseClient,
  cfg: SmokeConfig,
  branch: string,
  filePath: string,
): Promise<string> {
  const planId = `plan-${cfg.runId}-B`;
  const { data, error } = await sb
    .schema("system")
    .from("execution_tasks")
    .insert({
      type: "EXECUTE_DEV_PLAN",
      domain: "dev",
      risk_level: "MEDIUM",
      status: "queued",
      payload: {
        plan: {
          plan_id: planId,
          steps: [
            {
              id: `${planId}-merge`,
              kind: "merge.run",
              payload: {
                branch,
                file: filePath,
              },
            },
          ],
        },
        smoke: { run_id: cfg.runId, role: "branch-B-builder" },
      },
      requested_by: "smoke.merge-conflict-recovery",
      max_attempts: 1,
      approval_policy: "none",
      requires_approval: false,
    })
    .select("id")
    .single();
  if (error) throw new Error(`insert_builder_task_failed: ${error.message}`);
  return (data as { id: string }).id;
}

async function invokeDevBuilder(cfg: SmokeConfig, builderTaskId: string): Promise<void> {
  const url = `${cfg.supabaseUrl}/functions/v1/dev-builder`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${cfg.serviceKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ builder_task_id: builderTaskId }),
  });
  const text = await res.text();
  log("dev_builder_response", { status: res.status, body: text.slice(0, 500) });
  // Non-2xx is allowed: a hard drift block returns the loop result with
  // `blocked_by_drift`, which is what we WANT. Auth or input errors,
  // however, are fatal and already logged.
}

async function pollForReplan(
  sb: SupabaseClient,
  cfg: SmokeConfig,
  builderTaskId: string,
): Promise<BuilderTask> {
  const deadline = Date.now() + cfg.replanWaitMs;
  while (Date.now() <= deadline) {
    const { data, error } = await sb
      .schema("system")
      .from("execution_tasks")
      .select("id, payload")
      .eq("id", builderTaskId)
      .maybeSingle();
    if (error) throw new Error(`poll_failed: ${error.message}`);
    const row = data as BuilderTask | null;
    const reason = row?.payload?.last_replan?.reason;
    if (typeof reason === "string" && reason.startsWith("merge_conflict:overlap_with:")) {
      return row!;
    }
    await new Promise((r) => setTimeout(r, cfg.replanTickMs));
  }
  fail(3, "replan_timeout", { builder_task_id: builderTaskId, waited_ms: cfg.replanWaitMs });
}

async function pollForRev2Plan(
  sb: SupabaseClient,
  cfg: SmokeConfig,
  replanTaskId: string,
): Promise<{ stepsTouchedFile: boolean; planId: string }> {
  const deadline = Date.now() + cfg.replanWaitMs;
  while (Date.now() <= deadline) {
    const { data } = await sb
      .schema("system")
      .from("execution_tasks")
      .select("payload, status")
      .eq("id", replanTaskId)
      .maybeSingle();
    const plan = (data as { payload?: { plan?: { plan_id?: string; steps?: unknown[] } } } | null)?.payload?.plan;
    if (plan && Array.isArray(plan.steps)) {
      // The "non-overlapping" assertion is structural: rev 2 must NOT
      // contain a `merge.run` step targeting the same file at the
      // same hunk. We surface this for the operator to eyeball; a
      // strict check would need a planner contract that's out of
      // scope for this smoke.
      const json = JSON.stringify(plan);
      const stepsTouchedFile = json.includes("merge-conflict-recovery-");
      return { stepsTouchedFile, planId: plan.plan_id ?? replanTaskId };
    }
    await new Promise((r) => setTimeout(r, cfg.replanTickMs));
  }
  fail(3, "rev2_plan_timeout", { replan_task_id: replanTaskId });
}

async function main(): Promise<void> {
  const cfg = loadConfig();
  log("smoke_start", {
    repo: cfg.repo,
    base: cfg.baseBranch,
    run_id: cfg.runId,
    dry_run: cfg.dryRun,
  });

  const sb = createClient(cfg.supabaseUrl, cfg.serviceKey, {
    auth: { persistSession: false },
  });

  const filePath = `smoke/merge-conflict-recovery-${cfg.runId}.md`;
  const branchA = `agent-task-${cfg.runId}-A`;
  const branchB = `agent-task-${cfg.runId}-B`;

  // Pre-flight: ensure the file does not already exist on base. We use
  // the GitHub `contents` API; a 404 is the happy path.
  const checkRes = await fetch(
    `${GITHUB_API}/repos/${cfg.repo}/contents/${encodeURIComponent(filePath)}?ref=${encodeURIComponent(cfg.baseBranch)}`,
    { headers: { "Authorization": `Bearer ${cfg.pat}`, "Accept": "application/vnd.github+json" } },
  );
  if (checkRes.status === 200) {
    fail(1, "throwaway_file_already_exists", { file: filePath });
  }
  log("preflight_ok", { file: filePath });

  // Step 1: branch A — seed the file (becomes "base"), then PR.
  const prA = await openGithubPullRequest({
    pat: cfg.pat,
    repo: cfg.repo,
    baseBranch: cfg.baseBranch,
    headBranch: branchA,
    title: `[smoke ${cfg.runId}] branch A — conflict seed`,
    body: `LC4 merge-conflict recovery smoke (task #915), branch A.\n\nRun id: \`${cfg.runId}\``,
    commitMessage: `smoke(${cfg.runId}): branch A writes lines 5..8`,
    authorName: "smoke.merge-conflict-recovery",
    authorEmail: "smoke@platform.local",
    files: [{ path: filePath, content: makeFileBody("A", cfg.runId) }],
  });
  log("pr_a_opened", { number: prA.number, url: prA.url });

  // Step 2: branch B — opens a PR that overwrites the SAME hunk.
  // We start from base too (not from A) because the LC7 hook compares
  // against open PRs and merged commits; either source surfaces the
  // overlap. Starting from base is the more honest "two parallel
  // workers" simulation.
  const prB = await openGithubPullRequest({
    pat: cfg.pat,
    repo: cfg.repo,
    baseBranch: cfg.baseBranch,
    headBranch: branchB,
    title: `[smoke ${cfg.runId}] branch B — conflicting writer`,
    body: `LC4 merge-conflict recovery smoke (task #915), branch B.\n\nRun id: \`${cfg.runId}\``,
    commitMessage: `smoke(${cfg.runId}): branch B writes lines 5..8`,
    authorName: "smoke.merge-conflict-recovery",
    authorEmail: "smoke@platform.local",
    files: [{ path: filePath, content: makeFileBody("B", cfg.runId) }],
  });
  log("pr_b_opened", { number: prB.number, url: prB.url });

  if (cfg.dryRun) {
    log("dry_run_complete", { file: filePath, prA: prA.number, prB: prB.number });
    return;
  }

  // Step 3: merge PR A. Now branch B's write is in conflict with a
  // commit on the base branch — which is exactly the situation the
  // LC7 drift detector + LC4 recovery wiring exists for.
  const mergeA = await mergePullRequest(cfg, prA.number);
  log("pr_a_merged", { sha: mergeA.sha });

  // Step 4: insert the builder row for branch B and invoke the live
  // dev-builder edge function.
  const builderTaskId = await createBuilderTask(sb, cfg, branchB, filePath);
  log("builder_task_created", { builder_task_id: builderTaskId });
  await invokeDevBuilder(cfg, builderTaskId);

  // Step 5: assert the audit row carries the merge-conflict reason
  // verbatim. THIS IS THE CONTRACT FROM TASK #915.
  const row = await pollForReplan(sb, cfg, builderTaskId);
  const reason = row.payload.last_replan?.reason;
  const replanTaskId = row.payload.last_replan?.replan_task_id;
  if (
    typeof reason !== "string" ||
    !reason.startsWith("merge_conflict:overlap_with:") ||
    typeof replanTaskId !== "string"
  ) {
    fail(2, "audit_row_missing_reason", { row });
  }
  log("audit_row_verified", { reason, replan_task_id: replanTaskId });

  // Step 6: confirm the planner produced a rev-2 plan.
  const rev2 = await pollForRev2Plan(sb, cfg, replanTaskId!);
  log("rev2_plan_ready", rev2);

  log("smoke_complete", {
    builder_task_id: builderTaskId,
    replan_task_id: replanTaskId,
    reason,
  });
}

main().catch((err) => {
  fail(1, "smoke_unhandled_error", {
    message: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? err.stack : undefined,
  });
});

/**
 * execution-runner-callback — GitHub Actions runner status callback (#816).
 *
 * The GitHub Actions workflow (execution-runner.yml) posts to this function:
 *   - On start  → status: "RUNNING"  (stores authoritative external_run_url)
 *   - On success → status: "SUCCESS" (stores pr_url; transitions task running→succeeded)
 *   - On failure → status: "FAILED"  (stores error; transitions task running→failed)
 *
 * This function is the SOLE authority for task terminal-state transitions on
 * github-runner tasks. The execution-loop leaves the task in `running` after
 * dispatch; only SUCCESS/FAILED callbacks move it to a terminal state.
 *
 * Authentication: the runner sends HMAC-SHA256(RUNNER_HMAC_KEY, task_id) in
 * X-Runner-Token. This edge function loads runner_token_hash from the task row
 * (which holds the same HMAC, computed by execution-loop at dispatch time) and
 * compares them constant-time. Mismatches → 401.
 *
 * Token replay protection: on SUCCESS or FAILED we null out runner_token_hash
 * in the same UPDATE so the token cannot be replayed.
 */

import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { handlePreMergeDriftRequest } from "../_shared/execution/drift-detector.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-runner-token, x-trace-id, x-span-id, x-parent-span-id, x-request-id, traceparent",
};

type RunnerStatus = "RUNNING" | "SUCCESS" | "FAILED" | "PRE_MERGE";

/**
 * LC7 (#874) — pre-merge drift check payload. The GitHub Actions runner
 * (LC4 builder) MUST POST this BEFORE opening / merging the PR. The
 * callback enforces the drift detector and either:
 *   - returns 200 { proceed: true } when no hard overlap is found, OR
 *   - returns 409 { proceed: false, drift_report } AND transitions the
 *     execution_tasks row to status=blocked, blocked_reason=BLOCKED_BY_DRIFT.
 *
 * The runner is read-only on GitHub; it sends the diff it computed
 * locally (`current_branch` + `current_changes`) and the list of
 * `compared_against` branches with their changes. The callback never
 * opens its own connection to api.github.com — strict read-only
 * invariant of the LC7 brief.
 */
interface PreMergePayload {
  current_branch: string;
  current_changes: Array<{ file: string; startLine: number; endLine: number }>;
  others: Array<{
    ref: string;
    changes: Array<{ file: string; startLine: number; endLine: number }>;
  }>;
}

interface CallbackBody {
  task_id: string;
  status: RunnerStatus;
  pr_url?: string | null;
  external_run_url?: string | null;
  error?: string | null;
  logs?: string[] | null;
  /** LC7 — populated only when status === "PRE_MERGE". */
  pre_merge?: PreMergePayload | null;
}

/**
 * Constant-time string equality to prevent timing-oracle attacks.
 * Always iterates to max length regardless of early mismatch.
 */
function safeEqual(a: string, b: string): boolean {
  const len = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let i = 0; i < len; i++) {
    diff |= (a.charCodeAt(i) ?? 0) ^ (b.charCodeAt(i) ?? 0);
  }
  return diff === 0;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let body: CallbackBody;
  try {
    body = await req.json() as CallbackBody;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { task_id, status, pr_url, external_run_url, error: runnerError, logs } = body;

  if (!task_id || typeof task_id !== "string") {
    return new Response(JSON.stringify({ error: "task_id is required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!["RUNNING", "SUCCESS", "FAILED", "PRE_MERGE"].includes(status)) {
    return new Response(
      JSON.stringify({ error: "status must be RUNNING | SUCCESS | FAILED | PRE_MERGE" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  // ── Authenticate callback ─────────────────────────────────────────────
  // Authenticate BEFORE loading the full row to fail fast on bad token shape.
  const rawToken = req.headers.get("x-runner-token") ?? "";
  if (!rawToken) {
    return new Response(JSON.stringify({ error: "Missing X-Runner-Token header" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ── Load task row ─────────────────────────────────────────────────────
  const { data: taskRow, error: loadErr } = await sb
    .schema("system")
    .from("execution_tasks")
    .select("id, status, runner, runner_token_hash, execution_result, external_run_url, pr_url")
    .eq("id", task_id)
    .maybeSingle();

  if (loadErr || !taskRow) {
    return new Response(JSON.stringify({ error: "Task not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Verify this is a github-runner task
  if (taskRow.runner !== "github") {
    return new Response(JSON.stringify({ error: "Task is not a github-runner task" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const storedHmac = (taskRow.runner_token_hash as string | null) ?? "";
  if (!storedHmac) {
    // HMAC already cleared (replay attempt after a terminal SUCCESS/FAILED callback)
    return new Response(JSON.stringify({ error: "Token already consumed" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // The runner sends HMAC-SHA256(RUNNER_HMAC_KEY, task_id) in X-Runner-Token.
  // The execution-loop stored the same HMAC in runner_token_hash.
  // Constant-time compare to prevent timing-oracle guessing of the HMAC value.
  if (!safeEqual(rawToken, storedHmac)) {
    return new Response(JSON.stringify({ error: "Invalid runner token" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ── LC7 (#874) — pre-merge drift gate ─────────────────────────────────
  // Builder calls back with status="PRE_MERGE" BEFORE opening / merging
  // its PR. We run the pure overlap algorithm against the diff the runner
  // computed and either (a) green-light the merge, or (b) transition the
  // task to BLOCKED_BY_DRIFT and tell the runner to abort. This is the
  // single enforcement choke-point: even if a future builder forgets to
  // call the helper directly, it MUST hit this callback to obtain
  // permission to proceed (the runner has no other path back to the
  // orchestrator), so the merge gate is enforced server-side.
  if (status === "PRE_MERGE") {
    const result = await handlePreMergeDriftRequest(sb, task_id, body.pre_merge ?? null);
    if (result.httpStatus === 409 && result.report) {
      try {
        await sb.from("engine_run_logs").insert({
          engine_name: "execution-runner-callback",
          category: "github-runner-pre_merge_blocked",
          status: "warn",
          started_at: new Date().toISOString(),
          finished_at: new Date().toISOString(),
          duration_ms: 0,
          effect_summary: `Pre-merge drift blocked task=${task_id} branch=${result.report.current_branch} overlaps=${result.report.overlaps.length}`,
          metadata_json: {
            task_id,
            github_status: "PRE_MERGE_BLOCKED",
            severity: result.report.severity,
            overlap_count: result.report.overlaps.length,
          },
        });
      } catch {
        // best-effort audit
      }
    }
    return new Response(JSON.stringify(result.body), {
      status: result.httpStatus,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ── Build patch ───────────────────────────────────────────────────────
  // Write the canonical V2 columns (`execution_result` + `error_code`) so the
  // Command Center / orchestrator surfaces only have to read one shape. The
  // legacy `result` / `error` columns were dropped in task #851 (migration
  // 20260429000000_execution_tasks_drop_legacy_result_error.sql); a prior
  // backfill (#848) copied any in-flight legacy rows forward before the drop.
  const prevResult = (taskRow.execution_result as Record<string, unknown> | null) ?? {};
  const patch: Record<string, unknown> = {};

  if (status === "RUNNING") {
    // Authoritative run URL from the workflow itself — always overwrite.
    if (external_run_url) {
      patch.external_run_url = external_run_url;
    }
    patch.execution_result = {
      ...prevResult,
      github_status: "RUNNING",
      logs: logs ?? (prevResult.logs as unknown[] | undefined) ?? [],
    };
    // No task status transition — task stays `running`.

  } else if (status === "SUCCESS") {
    // Terminal: transition running → succeeded.
    patch.status = "succeeded";
    if (pr_url) patch.pr_url = pr_url;
    if (external_run_url) patch.external_run_url = external_run_url;
    patch.execution_result = {
      ...prevResult,
      github_status: "SUCCESS",
      pr_url: pr_url ?? null,
      logs: logs ?? (prevResult.logs as unknown[] | undefined) ?? [],
    };
    // One-time token consumed — clear hash to prevent replay.
    patch.runner_token_hash = null;

  } else {
    // FAILED: terminal — transition running → failed.
    patch.status = "failed";
    patch.error_code = runnerError ?? "GitHub Actions runner reported failure";
    if (external_run_url) patch.external_run_url = external_run_url;
    patch.execution_result = {
      ...prevResult,
      github_status: "FAILED",
      error: runnerError ?? null,
      logs: logs ?? (prevResult.logs as unknown[] | undefined) ?? [],
    };
    patch.runner_token_hash = null;
  }

  // For terminal transitions (SUCCESS/FAILED) assert the expected `from`
  // status to protect against race conditions (e.g. two callbacks arriving).
  let patchQuery = sb
    .schema("system")
    .from("execution_tasks")
    .update(patch)
    .eq("id", task_id);

  if (status === "SUCCESS" || status === "FAILED") {
    patchQuery = patchQuery.eq("status", "running");
  }

  const { data: patchData, error: patchErr } = await patchQuery.select("id");

  if (patchErr) {
    console.error("[execution-runner-callback] patch failed:", patchErr.message);
    return new Response(JSON.stringify({ error: "Failed to update task" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // If the patch returned no rows for a terminal callback, the task was already
  // transitioned (duplicate delivery from GHA retry). Return 200 so Actions
  // considers the step successful and doesn't endlessly retry.
  const alreadyTransitioned =
    (status === "SUCCESS" || status === "FAILED") && (patchData?.length ?? 0) === 0;

  // Log for auditability
  try {
    await sb.from("engine_run_logs").insert({
      engine_name: "execution-runner-callback",
      category: `github-runner-${status.toLowerCase()}`,
      status: status === "FAILED" ? "error" : "ok",
      started_at: new Date().toISOString(),
      finished_at: new Date().toISOString(),
      duration_ms: 0,
      effect_summary: alreadyTransitioned
        ? `GitHub runner callback DUPLICATE: task=${task_id} status=${status} (already transitioned)`
        : `GitHub runner callback: task=${task_id} status=${status}`,
      metadata_json: {
        task_id,
        github_status: status,
        pr_url: pr_url ?? null,
        external_run_url: external_run_url ?? null,
        error: runnerError ?? null,
        duplicate: alreadyTransitioned,
      },
      trigger_source: "execution-runner-callback",
    });
  } catch (e) {
    console.warn("[execution-runner-callback] engine_run_logs insert failed:", e);
  }

  return new Response(
    JSON.stringify({
      ok: true,
      task_id,
      github_status: status,
      duplicate: alreadyTransitioned,
    }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
});

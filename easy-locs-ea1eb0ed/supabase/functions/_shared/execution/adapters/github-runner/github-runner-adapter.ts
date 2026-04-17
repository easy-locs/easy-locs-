/**
 * GitHubRunnerAdapter — Phase 1 (#816).
 *
 * DomainAdapter for the "github-runner" domain. On execute():
 *   1. Validates the task payload.
 *   2. Generates a one-time callback token; stores its SHA-256 hash on the
 *      task row (for callback authentication) via a direct Supabase patch.
 *   3. Calls GitHub workflow_dispatch to trigger execution-runner.yml.
 *   4. Polls briefly for the triggered run URL; stores it on the task row.
 *   5. Returns AdapterResult { success: true } so the orchestrator can
 *      persist the "dispatched" outcome.
 *
 * The task row transitions:
 *   queued → running (orchestrator, before execute())
 *   running → succeeded (orchestrator, after execute() returns true)
 *
 * The callback Edge Function (execution-runner-callback) later writes
 * pr_url and the final GitHub run status into the result JSONB. Status
 * stays "succeeded" (= dispatched OK) from the orchestrator's perspective;
 * the GitHub-specific outcome is tracked via pr_url and result.github_status.
 *
 * Adapters MUST NOT mutate execution_tasks status — the direct patch here
 * only touches runner_token_hash and external_run_url, which are not
 * status/lifecycle columns.
 */

import type { SupabaseClient } from "npm:@supabase/supabase-js@2.57.2";
import type {
  AdapterResult,
  DomainAdapter,
  ExecutionContext,
  ExecutionTask,
} from "../../types.ts";
import {
  GITHUB_RUNNER_DOMAIN,
  GITHUB_RUNNER_ERROR_CODES,
  GITHUB_RUNNER_TASK_TYPES,
  type GithubRunnerDispatchResult,
  type SmokeNoopPayload,
} from "./types.ts";

const GITHUB_API = "https://api.github.com";
const DISPATCH_POLL_DELAY_MS = 3_000;
const DISPATCH_POLL_ATTEMPTS = 3;

// ── Token helpers ─────────────────────────────────────────────────────────

async function generateToken(): Promise<string> {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

async function sha256Hex(raw: string): Promise<string> {
  const enc = new TextEncoder();
  const buf = await crypto.subtle.digest("SHA-256", enc.encode(raw));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}

// ── GitHub API helpers ────────────────────────────────────────────────────

async function dispatchWorkflow(
  pat: string,
  repo: string,
  ref: string,
  workflowFile: string,
  inputs: Record<string, string>,
): Promise<boolean> {
  const res = await fetch(
    `${GITHUB_API}/repos/${repo}/actions/workflows/${workflowFile}/dispatches`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${pat}`,
        Accept: "application/vnd.github.v3+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ref, inputs }),
    },
  );
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.warn(`[github-runner] workflow_dispatch failed: ${res.status} ${text}`);
  }
  return res.status === 204;
}

/** Poll for the run that was just dispatched; returns the html_url or null. */
async function pollRunUrl(
  pat: string,
  repo: string,
  workflowFile: string,
  taskId: string,
): Promise<string | null> {
  await new Promise((r) => setTimeout(r, DISPATCH_POLL_DELAY_MS));
  for (let i = 0; i < DISPATCH_POLL_ATTEMPTS; i++) {
    try {
      const res = await fetch(
        `${GITHUB_API}/repos/${repo}/actions/workflows/${workflowFile}/runs?per_page=5`,
        {
          headers: {
            Authorization: `Bearer ${pat}`,
            Accept: "application/vnd.github.v3+json",
          },
        },
      );
      if (!res.ok) break;
      const json = await res.json() as { workflow_runs?: Array<{ id: number; html_url: string; name?: string; head_commit?: { message?: string } }> };
      const run = (json.workflow_runs ?? []).find((r) => {
        const msg = r.head_commit?.message ?? "";
        return msg.includes(taskId) || msg.includes("execution-runner");
      }) ?? json.workflow_runs?.[0] ?? null;
      if (run) return run.html_url;
    } catch {
      // non-fatal — we return null and continue
    }
    if (i < DISPATCH_POLL_ATTEMPTS - 1) {
      await new Promise((r) => setTimeout(r, 2_000));
    }
  }
  return null;
}

// ── Adapter factory ───────────────────────────────────────────────────────

export interface GitHubRunnerAdapterDeps {
  sb: SupabaseClient;
  /** GitHub PAT / App token with `workflow` scope. */
  pat: string;
  /** "owner/repo" */
  repo: string;
  /** Branch to dispatch against (default: main). */
  ref?: string;
  /** Workflow filename in .github/workflows (default: execution-runner.yml). */
  workflowFile?: string;
  /** Supabase callback URL sent to the runner (default: SUPABASE_URL env var). */
  supabaseUrl?: string;
}

function createGitHubRunnerAdapter(deps: GitHubRunnerAdapterDeps): DomainAdapter {
  const ref = deps.ref ?? "main";
  const workflowFile = deps.workflowFile ?? "execution-runner.yml";

  return {
    domain: GITHUB_RUNNER_DOMAIN,
    taskType: GITHUB_RUNNER_TASK_TYPES.SMOKE_NOOP,

    agent: {
      slug: "github-runner-smoke",
      version: "1.0.0",
      kind: "dev.builder",
      displayName: "GitHub Actions Runner (smoke / noop)",
      ownerTeam: "platform",
      policyProfile: "low-risk",
    },

    getLockKey(task: ExecutionTask): string {
      return `github-runner::${task.id}`;
    },

    getIdempotencyKey(task: ExecutionTask): string {
      return `github-runner::smoke::${task.id}`;
    },

    async execute(ctx: ExecutionContext): Promise<AdapterResult> {
      const { task } = ctx;
      const payload = (task.payload ?? {}) as SmokeNoopPayload;
      const label = typeof payload.label === "string" ? payload.label : "";

      // Generate one-time callback token
      const rawToken = await generateToken();
      const tokenHash = await sha256Hex(rawToken);

      // Store token hash + mark runner on the task row (non-lifecycle columns)
      const patchRes = await deps.sb
        .schema("system")
        .from("execution_tasks")
        .update({ runner_token_hash: tokenHash, runner: "github" })
        .eq("id", task.id);
      if (patchRes.error) {
        console.warn("[github-runner] token hash patch failed:", patchRes.error.message);
      }

      // Dispatch the GitHub Actions workflow
      const inputs: Record<string, string> = {
        task_id: task.id,
        task_type: task.type,
        callback_token: rawToken,
        supabase_url: deps.supabaseUrl ?? Deno.env.get("SUPABASE_URL") ?? "",
        label: label || `execution-runner task ${task.id}`,
      };

      const dispatched = await dispatchWorkflow(deps.pat, deps.repo, ref, workflowFile, inputs);
      if (!dispatched) {
        return {
          success: false,
          errorCode: GITHUB_RUNNER_ERROR_CODES.DISPATCH_FAILED,
          errorMessage: `workflow_dispatch to ${deps.repo}/${workflowFile} failed`,
          logs: [`[github-runner] dispatch FAILED for task ${task.id}`],
          actionsTaken: ["dispatch_attempted"],
        };
      }

      // Best-effort: fetch the run URL for the dashboard
      const runUrl = await pollRunUrl(deps.pat, deps.repo, workflowFile, task.id);

      // Patch external_run_url if we found it
      if (runUrl) {
        await deps.sb
          .schema("system")
          .from("execution_tasks")
          .update({ external_run_url: runUrl })
          .eq("id", task.id);
      }

      const output: GithubRunnerDispatchResult = {
        dispatched: true,
        runner: "github",
        task_type: GITHUB_RUNNER_TASK_TYPES.SMOKE_NOOP,
        external_run_url: runUrl,
        label: label || undefined,
      };

      return {
        success: true,
        output: output as Record<string, unknown>,
        logs: [
          `[github-runner] dispatched task ${task.id} to ${deps.repo}/${workflowFile} ref=${ref}`,
          runUrl ? `[github-runner] run URL: ${runUrl}` : "[github-runner] run URL pending (poll timed out)",
        ],
        actionsTaken: ["workflow_dispatch", ...(runUrl ? ["run_url_captured"] : [])],
      };
    },
  };
}

export { createGitHubRunnerAdapter };

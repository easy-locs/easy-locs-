/**
 * revert_pr — LC6 (task #877) rollback strategy.
 *
 * Reverts a merged PR / commit on the production branch via the GitHub
 * REST API. Used as the auto-rollback handler for `deploy.prod` (and any
 * future dev.* agent that mutates the production codebase) when the
 * post-deploy health check fails inside the LC6 watch window.
 *
 * Strategy contract:
 *   - Strategy slug: `revert_pr` (also stored in `system.rollback_strategies`
 *     by migration 20260501000000_lc6_rollback_strategies.sql).
 *   - Deterministic: never tries a force-push, never rewrites history.
 *     A revert is a NEW commit on top of the same branch, surfaced for
 *     audit in the GitHub UI exactly like any human revert.
 *   - Idempotent: if a revert commit for the same SHA already exists on
 *     the branch (detected by commit message marker), the strategy
 *     returns success without creating a duplicate.
 *   - Fail-loud: any GitHub error short-circuits to `success=false`. The
 *     orchestrator transitions the task to `rollback_failed`, which is
 *     not terminal — a human can retry.
 *
 * The GitHub client is injected so unit tests can stub the four calls we
 * need (get commit / list commits / create commit / update ref). In prod
 * the edge bootstrap wires `createGithubRevertClient(token, repo)`.
 */

export interface RevertPrInvocation {
  /** Owner/name of the GitHub repo to revert against, e.g. `acme/easylocs`. */
  repo: string;
  /** Branch the merged PR landed on (typically `main`). */
  branch: string;
  /** Commit SHA of the merge commit OR the squashed PR commit to revert. */
  commitSha: string;
  /** PR number (informational, embedded in revert message). */
  prNumber?: number | null;
  /** Operator-supplied or auto-rollback reason (audit only). */
  reason: string;
  /** Free-form correlation id (e.g. originating execution_tasks.id). */
  correlationId?: string | null;
}

export interface RevertPrOutcome {
  success: boolean;
  /** SHA of the revert commit (or pre-existing one when idempotent). */
  revertCommitSha: string | null;
  /** True when the strategy short-circuited because a prior revert was found. */
  alreadyReverted: boolean;
  /** Free-form diagnostic — present on both success and failure. */
  message: string;
  /** Error code on failure; absent on success. */
  errorCode?: RevertPrErrorCode;
  /** Structured GitHub-side fields the audit log persists. */
  details?: Record<string, unknown>;
}

export const REVERT_PR_ERROR_CODES = {
  INVALID_INVOCATION: "REVERT_PR_INVALID_INVOCATION",
  COMMIT_NOT_FOUND: "REVERT_PR_COMMIT_NOT_FOUND",
  CLIENT_THREW: "REVERT_PR_CLIENT_THREW",
  CREATE_FAILED: "REVERT_PR_CREATE_FAILED",
  PUSH_FAILED: "REVERT_PR_PUSH_FAILED",
} as const;

export type RevertPrErrorCode =
  (typeof REVERT_PR_ERROR_CODES)[keyof typeof REVERT_PR_ERROR_CODES];

/**
 * The minimum surface area we need from a GitHub-shaped client. Real
 * implementations wrap `@octokit/rest`; tests provide a hand-rolled stub.
 */
export interface GithubRevertClient {
  /** Fetch a single commit. Used to assert it exists + read its message. */
  getCommit(args: {
    repo: string;
    sha: string;
  }): Promise<{ sha: string; message: string; parents: string[] } | null>;
  /**
   * List recent commits on `branch` (most recent first). Used to detect
   * an existing revert commit so we don't double-revert.
   */
  listRecentCommits(args: {
    repo: string;
    branch: string;
    limit: number;
  }): Promise<Array<{ sha: string; message: string }>>;
  /**
   * Create a NEW commit that reverts `commitSha` and push it to `branch`.
   * Implementations are free to use the high-level "Revert" PR endpoint
   * or the low-level git data API — we only require the resulting SHA.
   */
  createRevertCommit(args: {
    repo: string;
    branch: string;
    commitSha: string;
    message: string;
  }): Promise<{ sha: string }>;
}

const REVERT_MARKER = "lc6-revert-pr";

function buildRevertMessage(inv: RevertPrInvocation): string {
  const prRef = inv.prNumber ? `#${inv.prNumber}` : inv.commitSha.slice(0, 7);
  const corr = inv.correlationId ? ` (task ${inv.correlationId})` : "";
  return [
    `Revert ${prRef} via ${REVERT_MARKER}${corr}`,
    "",
    `Reason: ${inv.reason}`,
    `Reverted-Commit: ${inv.commitSha}`,
    `Marker: ${REVERT_MARKER}:${inv.commitSha}`,
  ].join("\n");
}

function findExistingRevert(
  recent: Array<{ sha: string; message: string }>,
  commitSha: string,
): { sha: string; message: string } | null {
  const needle = `${REVERT_MARKER}:${commitSha}`;
  return recent.find((c) => c.message.includes(needle)) ?? null;
}

function validate(inv: RevertPrInvocation): string | null {
  if (!inv.repo || typeof inv.repo !== "string" || !inv.repo.includes("/")) {
    return "`repo` must be in the form 'owner/name'";
  }
  if (!inv.branch || typeof inv.branch !== "string") return "`branch` is required";
  if (!inv.commitSha || typeof inv.commitSha !== "string" || inv.commitSha.length < 7) {
    return "`commitSha` must be a non-empty git SHA";
  }
  if (!inv.reason || typeof inv.reason !== "string" || inv.reason.trim() === "") {
    return "`reason` is required (audit)";
  }
  return null;
}

/**
 * Execute the `revert_pr` rollback strategy. Pure orchestration — the
 * caller (auto-rollback hook OR `system.request_rollback` follow-up) is
 * responsible for translating the outcome into an `execution_tasks` row
 * transition (`rolled_back` vs `rollback_failed`).
 */
export async function executeRevertPr(
  client: GithubRevertClient,
  invocation: RevertPrInvocation,
): Promise<RevertPrOutcome> {
  const validationError = validate(invocation);
  if (validationError) {
    return {
      success: false,
      revertCommitSha: null,
      alreadyReverted: false,
      message: `revert_pr: invalid invocation — ${validationError}`,
      errorCode: REVERT_PR_ERROR_CODES.INVALID_INVOCATION,
    };
  }

  let commit: Awaited<ReturnType<GithubRevertClient["getCommit"]>>;
  try {
    commit = await client.getCommit({
      repo: invocation.repo,
      sha: invocation.commitSha,
    });
  } catch (err) {
    return clientThrew(err, "getCommit");
  }
  if (!commit) {
    return {
      success: false,
      revertCommitSha: null,
      alreadyReverted: false,
      message: `revert_pr: commit ${invocation.commitSha} not found in ${invocation.repo}`,
      errorCode: REVERT_PR_ERROR_CODES.COMMIT_NOT_FOUND,
    };
  }

  // Idempotency: scan recent history for our marker.
  let recent: Array<{ sha: string; message: string }>;
  try {
    recent = await client.listRecentCommits({
      repo: invocation.repo,
      branch: invocation.branch,
      limit: 50,
    });
  } catch (err) {
    return clientThrew(err, "listRecentCommits");
  }
  const existing = findExistingRevert(recent, invocation.commitSha);
  if (existing) {
    return {
      success: true,
      revertCommitSha: existing.sha,
      alreadyReverted: true,
      message: `revert_pr: prior revert ${existing.sha.slice(0, 7)} found, skipping`,
      details: {
        repo: invocation.repo,
        branch: invocation.branch,
        commitSha: invocation.commitSha,
        existingRevertSha: existing.sha,
      },
    };
  }

  let result: { sha: string };
  try {
    result = await client.createRevertCommit({
      repo: invocation.repo,
      branch: invocation.branch,
      commitSha: invocation.commitSha,
      message: buildRevertMessage(invocation),
    });
  } catch (err) {
    return clientThrew(err, "createRevertCommit");
  }
  if (!result || !result.sha) {
    return {
      success: false,
      revertCommitSha: null,
      alreadyReverted: false,
      message: "revert_pr: createRevertCommit returned no SHA",
      errorCode: REVERT_PR_ERROR_CODES.CREATE_FAILED,
    };
  }

  return {
    success: true,
    revertCommitSha: result.sha,
    alreadyReverted: false,
    message: `revert_pr: reverted ${invocation.commitSha.slice(0, 7)} as ${result.sha.slice(0, 7)}`,
    details: {
      repo: invocation.repo,
      branch: invocation.branch,
      commitSha: invocation.commitSha,
      revertCommitSha: result.sha,
      pr_number: invocation.prNumber ?? null,
      correlation_id: invocation.correlationId ?? null,
    },
  };
}

function clientThrew(err: unknown, op: string): RevertPrOutcome {
  const message = err instanceof Error ? err.message : String(err);
  return {
    success: false,
    revertCommitSha: null,
    alreadyReverted: false,
    message: `revert_pr: GitHub client threw during ${op}: ${message}`,
    errorCode: REVERT_PR_ERROR_CODES.CLIENT_THREW,
    details: { op },
  };
}

/** Strategy slug — single source of truth (mirrored in SQL migration). */
export const REVERT_PR_STRATEGY_SLUG = "revert_pr";

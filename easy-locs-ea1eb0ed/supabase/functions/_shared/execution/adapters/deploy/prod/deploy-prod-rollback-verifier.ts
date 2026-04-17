/**
 * DeployProdRollbackVerifier — LC6 (#877).
 *
 * Verifies that a child `deploy.prod.rollback` task actually performed
 * (or idempotently skipped) the `revert_pr` strategy. Without this
 * verifier the orchestrator would refuse to ratify the adapter output
 * with `NO_VERIFIER` and settle the rollback row `blocked`, breaking
 * the LC6 child-row lifecycle contract.
 *
 * Shape pinned by `deploy-prod-rollback-adapter.ts` + `revert-pr.ts`:
 *   output: {
 *     strategy: "revert_pr",
 *     revert_commit_sha?: string | null,   // set when createRevertCommit ran
 *     already_reverted?: boolean,          // true on idempotent replays
 *     parent_task_id?: string | null,
 *     ...details,
 *   }
 */

import type { TaskVerifier, VerifierResult } from "../../../verifier-registry.ts";
import type { ExecutionTask } from "../../../types.ts";
import { DEPLOY_DOMAIN, DEPLOY_TASK_TYPES } from "../types.ts";
import { REVERT_PR_STRATEGY_SLUG } from "../../../rollback/revert-pr.ts";

function unwrap(executionResult: Record<string, unknown>): Record<string, unknown> {
  const out = executionResult.output;
  if (out && typeof out === "object") return out as Record<string, unknown>;
  return executionResult;
}

export function createDeployProdRollbackVerifier(): TaskVerifier {
  return {
    domain: DEPLOY_DOMAIN,
    taskType: DEPLOY_TASK_TYPES.PROD_ROLLBACK,

    async verify(
      task: ExecutionTask,
      executionResult: Record<string, unknown>,
    ): Promise<VerifierResult> {
      const r = unwrap(executionResult);
      if (r.strategy !== REVERT_PR_STRATEGY_SLUG) {
        return {
          ok: false,
          expected: { strategy: REVERT_PR_STRATEGY_SLUG },
          actual: { strategy: r.strategy ?? null },
          mismatchPath: "strategy",
          details: { task_id: task.id },
        };
      }
      const already = r.already_reverted === true;
      const sha = typeof r.revert_commit_sha === "string" && r.revert_commit_sha.length > 0
        ? r.revert_commit_sha
        : null;
      if (!already && !sha) {
        return {
          ok: false,
          expected: {
            revert_commit_sha: "non-empty string",
            already_reverted: "true (idempotent replay)",
          },
          actual: { revert_commit_sha: r.revert_commit_sha ?? null, already_reverted: already },
          mismatchPath: "revert_commit_sha",
          details: { task_id: task.id },
        };
      }
      return {
        ok: true,
        details: {
          task_id: task.id,
          strategy: REVERT_PR_STRATEGY_SLUG,
          revert_commit_sha: sha,
          already_reverted: already,
          parent_task_id: (r.parent_task_id as string | null) ?? null,
        },
      };
    },
  };
}

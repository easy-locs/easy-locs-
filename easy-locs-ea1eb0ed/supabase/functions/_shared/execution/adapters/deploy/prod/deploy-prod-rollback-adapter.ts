/**
 * DeployProdRollbackAdapter — LC6 (#877).
 *
 * Child adapter that executes a `revert_pr` rollback as a first-class
 * execution_tasks row (type `DEPLOY_PROD_ROLLBACK`). The row is
 * inserted by `createSupabaseRollbackDispatcher` when the post-deploy
 * health check fails; this adapter is what the orchestrator dispatches
 * on the next loop tick.
 *
 * Payload contract (written by the dispatcher):
 *   {
 *     commitSha: string,   // deployed SHA to revert (from parent payload/output)
 *     repo:      string,   // "owner/name"
 *     branch:    string,
 *     reason:    string,
 *     parent_task_id: string,
 *     trigger:   "lc6_auto_rollback",
 *   }
 *
 * The adapter returns success/failure based on `executeRevertPr`; the
 * orchestrator then settles the child row independently of its parent.
 */

import type {
  AdapterResult,
  DomainAdapter,
  ExecutionContext,
} from "../../../types.ts";
import {
  DEPLOY_DOMAIN,
  DEPLOY_TASK_TYPES,
} from "../types.ts";
import {
  executeRevertPr,
  REVERT_PR_STRATEGY_SLUG,
  type GithubRevertClient,
  type RevertPrInvocation,
} from "../../../rollback/revert-pr.ts";

export interface DeployProdRollbackAdapterDeps {
  client: GithubRevertClient;
  /** Fallback repo if the child row payload didn't include one. */
  defaultRepo?: string;
  /** Fallback branch if the child row payload didn't include one. */
  defaultBranch?: string;
}

function asStr(v: unknown): string | null {
  return typeof v === "string" && v.length > 0 ? v : null;
}

export function createDeployProdRollbackAdapter(
  deps: DeployProdRollbackAdapterDeps,
): DomainAdapter {
  return {
    domain: DEPLOY_DOMAIN,
    taskType: DEPLOY_TASK_TYPES.PROD_ROLLBACK,
    rollback_strategy: "none",

    agent: {
      slug: "deploy.prod.rollback",
      version: "1.0.0",
      kind: "code.tool",
      displayName: "Deploy (Vercel production) — revert_pr rollback",
      ownerTeam: "platform-dev",
      policyProfile: "dev-sensitive",
      metadata: {
        description:
          "Executes the revert_pr rollback strategy as a first-class " +
          "execution_tasks row linked to the failed deploy via " +
          "parent_task_id. Invoked by the LC6 auto-rollback dispatcher.",
        rollback_strategy: "none",
        rollback_strategy_name: REVERT_PR_STRATEGY_SLUG,
        sensitive: true,
      },
    },

    getLockKey(task) {
      const payload = (task.payload ?? {}) as Record<string, unknown>;
      const repo = asStr(payload.repo) ?? deps.defaultRepo ?? "unknown";
      const branch = asStr(payload.branch) ?? deps.defaultBranch ?? "main";
      return `deploy:prod:rollback:${repo}:${branch}`;
    },

    async execute(ctx: ExecutionContext): Promise<AdapterResult> {
      const payload = (ctx.task.payload ?? {}) as Record<string, unknown>;
      const commitSha = asStr(payload.commitSha);
      const repo = asStr(payload.repo) ?? deps.defaultRepo ?? null;
      const branch = asStr(payload.branch) ?? deps.defaultBranch ?? null;
      const reason = asStr(payload.reason) ??
        `LC6 auto-rollback (parent=${asStr(payload.parent_task_id) ?? "unknown"})`;

      if (!commitSha || !repo || !branch) {
        return {
          success: false,
          errorCode: "REVERT_PR_INVALID_INVOCATION",
          errorMessage:
            `deploy.prod.rollback: missing payload fields ` +
            `(commitSha=${Boolean(commitSha)}, repo=${Boolean(repo)}, branch=${Boolean(branch)})`,
          logs: [],
        };
      }

      const inv: RevertPrInvocation = {
        repo,
        branch,
        commitSha,
        reason,
        correlationId: asStr(payload.parent_task_id) ?? ctx.task.id,
      };
      const outcome = await executeRevertPr(deps.client, inv);
      return {
        success: outcome.success,
        output: {
          strategy: REVERT_PR_STRATEGY_SLUG,
          revert_commit_sha: outcome.revertCommitSha,
          already_reverted: outcome.alreadyReverted,
          parent_task_id: asStr(payload.parent_task_id),
          ...(outcome.details ?? {}),
        },
        errorCode: outcome.errorCode,
        errorMessage: outcome.message,
        logs: [outcome.message],
      };
    },
  };
}

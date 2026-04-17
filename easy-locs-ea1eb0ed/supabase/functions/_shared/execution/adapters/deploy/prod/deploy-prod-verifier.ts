/**
 * DeployProdVerifier — LC2 (task #872).
 *
 * Confirms a successful prod dispatch carried a valid Vercel id + URL
 * AND that an approval was on the row at execution time. The latter is
 * the verifier's policy hook for `dev-sensitive`: even on success we
 * refuse to ratify a deploy.prod that lacks `approved_by`.
 *
 * The orchestrator wraps the adapter result as `{ output, logs,
 * actions_taken }`; we unwrap to inspect the structured deploy fields.
 */

import type { TaskVerifier, VerifierResult } from "../../../verifier-registry.ts";
import type { ExecutionTask } from "../../../types.ts";
import { DEPLOY_DOMAIN, DEPLOY_TASK_TYPES } from "../types.ts";

function unwrap(executionResult: Record<string, unknown>): Record<string, unknown> {
  const out = executionResult.output;
  if (out && typeof out === "object") return out as Record<string, unknown>;
  return executionResult;
}

export function createDeployProdVerifier(): TaskVerifier {
  return {
    domain: DEPLOY_DOMAIN,
    taskType: DEPLOY_TASK_TYPES.PROD,

    async verify(
      task: ExecutionTask,
      executionResult: Record<string, unknown>,
    ): Promise<VerifierResult> {
      // Hard gate (dev-sensitive): refuse to ratify any prod deploy that
      // wasn't approved on the row, even if dispatch reported success.
      if (!task.approved_by) {
        return {
          ok: false,
          expected: { approved_by: "non-null" },
          actual: { approved_by: null },
          mismatchPath: "approved_by",
          details: { task_id: task.id, reason: "dev-sensitive_policy_violation" },
        };
      }
      const r = unwrap(executionResult);
      if (r.status_lifecycle !== "succeeded") {
        return {
          ok: false,
          expected: { status_lifecycle: "succeeded" },
          actual: { status_lifecycle: r.status_lifecycle ?? null },
          mismatchPath: "status_lifecycle",
          details: { task_id: task.id },
        };
      }
      if (typeof r.deploymentId !== "string" ||
          typeof r.url !== "string" ||
          !r.url) {
        return {
          ok: false,
          expected: { deploymentId: "string", url: "non-empty string" },
          actual: {
            deploymentId: r.deploymentId ?? null,
            url: r.url ?? null,
          },
          mismatchPath: "url",
          details: { task_id: task.id },
        };
      }
      return {
        ok: true,
        details: {
          task_id: task.id,
          target: "production",
          deployment_id: r.deploymentId,
          url: r.url,
          approved_by: task.approved_by,
        },
      };
    },
  };
}

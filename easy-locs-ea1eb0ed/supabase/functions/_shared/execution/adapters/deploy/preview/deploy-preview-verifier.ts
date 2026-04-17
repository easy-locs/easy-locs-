/**
 * DeployPreviewVerifier — LC2 (task #872).
 *
 * Confirms the runner returned a valid Vercel deployment id + URL and a
 * non-error lifecycle status. Full READY confirmation is left to a
 * background poller; the verifier ratifies that dispatch succeeded.
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

export function createDeployPreviewVerifier(): TaskVerifier {
  return {
    domain: DEPLOY_DOMAIN,
    taskType: DEPLOY_TASK_TYPES.PREVIEW,

    async verify(
      task: ExecutionTask,
      executionResult: Record<string, unknown>,
    ): Promise<VerifierResult> {
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
          target: "preview",
          deployment_id: r.deploymentId,
          url: r.url,
        },
      };
    },
  };
}

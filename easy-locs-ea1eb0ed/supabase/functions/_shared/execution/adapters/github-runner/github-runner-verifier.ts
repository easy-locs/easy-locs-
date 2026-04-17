/**
 * GitHubRunnerVerifier — Phase 1 (#816).
 *
 * The orchestrator requires a registered TaskVerifier for every adapter.
 * For the github-runner domain the verification step confirms that the
 * dispatch result is structurally valid (dispatched=true). Full workflow
 * completion is verified out-of-band via the callback Edge Function;
 * the verifier here is intentionally lightweight.
 */

import type { TaskVerifier, VerifierResult } from "../../verifier-registry.ts";
import type { ExecutionTask } from "../../types.ts";
import { GITHUB_RUNNER_DOMAIN, GITHUB_RUNNER_TASK_TYPES } from "./types.ts";

function createGitHubRunnerVerifier(): TaskVerifier {
  return {
    domain: GITHUB_RUNNER_DOMAIN,
    taskType: GITHUB_RUNNER_TASK_TYPES.SMOKE_NOOP,

    async verify(
      task: ExecutionTask,
      executionResult: Record<string, unknown>,
    ): Promise<VerifierResult> {
      if (executionResult.dispatched !== true) {
        return {
          ok: false,
          expected: { dispatched: true },
          actual: executionResult,
          mismatchPath: "dispatched",
          details: { task_id: task.id },
        };
      }

      return {
        ok: true,
        details: {
          task_id: task.id,
          runner: "github",
          external_run_url: executionResult.external_run_url ?? null,
        },
      };
    },
  };
}

export { createGitHubRunnerVerifier };

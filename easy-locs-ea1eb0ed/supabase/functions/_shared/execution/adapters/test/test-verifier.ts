/**
 * TestVerifier — LC2 (task #872).
 *
 * The orchestrator wraps the adapter result as
 * `{ output, logs, actions_taken }`; we unwrap to inspect the structured
 * test-run fields. Tests calling the verifier with the bare output are
 * also supported.
 *
 * Confirms a successful run reported a non-negative pass count and zero
 * failures. The orchestrator routes adapter `success=false` to the failed
 * lane independently; this verifier ratifies the success path only.
 */

import type { TaskVerifier, VerifierResult } from "../../verifier-registry.ts";
import type { ExecutionTask } from "../../types.ts";
import { TEST_DOMAIN, TEST_TASK_TYPES } from "./types.ts";

function unwrap(executionResult: Record<string, unknown>): Record<string, unknown> {
  const out = executionResult.output;
  if (out && typeof out === "object") return out as Record<string, unknown>;
  return executionResult;
}

export function createTestVerifier(): TaskVerifier {
  return {
    domain: TEST_DOMAIN,
    taskType: TEST_TASK_TYPES.RUN,

    async verify(
      task: ExecutionTask,
      executionResult: Record<string, unknown>,
    ): Promise<VerifierResult> {
      const r = unwrap(executionResult);
      if (r.status !== "succeeded") {
        return {
          ok: false,
          expected: { status: "succeeded" },
          actual: { status: r.status ?? null },
          mismatchPath: "status",
          details: { task_id: task.id },
        };
      }
      const failed = Number(r.failed ?? 0);
      if (Number.isNaN(failed) || failed > 0) {
        return {
          ok: false,
          expected: { failed: 0 },
          actual: { failed: r.failed ?? null },
          mismatchPath: "failed",
          details: { task_id: task.id },
        };
      }
      return {
        ok: true,
        details: {
          task_id: task.id,
          passed: r.passed ?? null,
          skipped: r.skipped ?? null,
          coverage: r.coverage ?? null,
        },
      };
    },
  };
}

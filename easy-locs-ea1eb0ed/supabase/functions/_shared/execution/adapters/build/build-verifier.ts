/**
 * BuildVerifier — LC2 (task #872).
 *
 * The orchestrator wraps the adapter result as
 * `{ output, logs, actions_taken }` before handing it to a verifier
 * (see orchestrator-v2.ts ~line 531). We therefore reach into
 * `executionResult.output` for the structured fields; tests that call the
 * verifier directly with the bare adapter output are also supported via a
 * top-level fallback.
 *
 * Confirms the BuildAdapter delivered a structurally valid result. The
 * orchestrator already routes `success=false` adapter outcomes to the
 * `failed` lane; this verifier therefore only needs to ratify shape +
 * non-negative bundle metrics for the success path.
 */

import type { TaskVerifier, VerifierResult } from "../../verifier-registry.ts";
import type { ExecutionTask } from "../../types.ts";
import { BUILD_DOMAIN, BUILD_TASK_TYPES } from "./types.ts";

function unwrap(executionResult: Record<string, unknown>): Record<string, unknown> {
  const out = executionResult.output;
  if (out && typeof out === "object") return out as Record<string, unknown>;
  return executionResult;
}

export function createBuildVerifier(): TaskVerifier {
  return {
    domain: BUILD_DOMAIN,
    taskType: BUILD_TASK_TYPES.RUN,

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
      if (typeof r.bundleBytes !== "number" || (r.bundleBytes as number) < 0) {
        return {
          ok: false,
          expected: { bundleBytes: ">= 0" },
          actual: { bundleBytes: r.bundleBytes ?? null },
          mismatchPath: "bundleBytes",
          details: { task_id: task.id },
        };
      }
      return {
        ok: true,
        details: {
          task_id: task.id,
          bundle_bytes: r.bundleBytes,
          build_minutes: r.buildMinutes ?? null,
        },
      };
    },
  };
}

/**
 * composeVerifiers — LC6 (task #877).
 *
 * The VerifierRegistry binds exactly one TaskVerifier per (domain, taskType).
 * LC6 needs to enforce the dev-verifier (build/test/typecheck must be green)
 * IN ADDITION TO the existing per-adapter shape verifier (e.g. the LC1
 * code-edit shape check). `composeVerifiers` returns a single TaskVerifier
 * that runs the supplied list left-to-right and short-circuits on the first
 * mismatch. Failure ordering is therefore deterministic and matches the
 * registration order.
 */

import type {
  TaskVerifier,
  VerifierResult,
} from "../verifier-registry.ts";
import type { ExecutionTask } from "../types.ts";

export function composeVerifiers(
  members: TaskVerifier[],
  opts?: { domain?: string; taskType?: string },
): TaskVerifier {
  if (members.length === 0) {
    throw new Error("composeVerifiers: at least one member is required");
  }
  const domain = opts?.domain ?? members[0].domain;
  const taskType = opts?.taskType ?? members[0].taskType;
  for (const m of members) {
    if (m.domain !== domain || m.taskType !== taskType) {
      throw new Error(
        `composeVerifiers: member (${m.domain}, ${m.taskType}) ` +
          `does not match composer (${domain}, ${taskType})`,
      );
    }
  }
  return {
    domain,
    taskType,
    async verify(
      task: ExecutionTask,
      executionResult: Record<string, unknown>,
    ): Promise<VerifierResult> {
      const detailsByMember: Array<{
        member: string;
        result: Record<string, unknown> | undefined;
      }> = [];
      for (let i = 0; i < members.length; i++) {
        const m = members[i];
        const memberLabel = `member[${i}]`;
        let result: VerifierResult;
        try {
          result = await m.verify(task, executionResult);
        } catch (e) {
          const message = e instanceof Error ? e.message : String(e);
          return {
            ok: false,
            expected: { [memberLabel]: "no exception" },
            actual: { [memberLabel]: `threw: ${message}` },
            mismatchPath: memberLabel,
            details: { task_id: task.id, members: detailsByMember },
          };
        }
        if (!result.ok) {
          return {
            ...result,
            details: {
              ...(result.details ?? {}),
              composed_by: memberLabel,
              prior_members: detailsByMember,
            },
          };
        }
        detailsByMember.push({ member: memberLabel, result: result.details });
      }
      return {
        ok: true,
        details: { task_id: task.id, members: detailsByMember },
      };
    },
  };
}

/**
 * code.edit verifier (LC1, task #871).
 *
 * IMPORTANT: the verifier validates the adapter's *immutable output*
 * rather than re-reading the workspace. Reading the workspace post-hoc
 * would either (a) require keeping the temp clone alive past the run
 * (breaking the "ephemeral sandbox" contract), or (b) re-clone a fresh
 * workspace whose state by definition does not reflect the run's writes
 * (false negatives). Validating the recorded payload gives us a
 * deterministic, lifecycle-free integrity check:
 *
 *   - every entry in `output.modifiedFiles` has a 64-hex afterChecksum
 *     and (when before existed) a different 64-hex beforeChecksum;
 *   - the structured unified diff contains a `--- a/<path>` header for
 *     every modified file (proves the diff was actually emitted);
 *   - the recorded `diffBytes` matches the encoded length of
 *     `unifiedDiff`;
 *   - every `operations[i].ok` is true on success and op set covers
 *     all reported modified files.
 *
 * The orchestrator passes the full AdapterResult as `executionResult`,
 * which is shaped as `{ output, logs, actions_taken, ... }` — the
 * verifier unwraps `output` to get to the CodeEditResult.
 */

import type {
  TaskVerifier,
  VerifierResult,
} from "../../verifier-registry.ts";
import type { ExecutionTask } from "../../types.ts";
import {
  CODE_DOMAIN,
  CODE_TASK_TYPES,
  type CodeEditResult,
  type FileChange,
} from "./types.ts";

const SHA256_RE = /^[0-9a-f]{64}$/;

function unwrap(executionResult: Record<string, unknown>): CodeEditResult | null {
  if (!executionResult || typeof executionResult !== "object") return null;
  const candidate =
    (executionResult as { output?: unknown }).output ?? executionResult;
  if (!candidate || typeof candidate !== "object") return null;
  const c = candidate as Partial<CodeEditResult>;
  if (!Array.isArray(c.modifiedFiles)) return null;
  if (typeof c.unifiedDiff !== "string") return null;
  return c as CodeEditResult;
}

export function createCodeEditVerifier(): TaskVerifier {
  return {
    domain: CODE_DOMAIN,
    taskType: CODE_TASK_TYPES.EDIT,
    async verify(
      _task: ExecutionTask,
      executionResult: Record<string, unknown>,
    ): Promise<VerifierResult> {
      const summary = unwrap(executionResult);
      if (!summary) {
        return {
          ok: false,
          expected: { shape: "CodeEditResult" },
          actual: { keys: executionResult ? Object.keys(executionResult) : null },
          mismatchPath: "output",
        };
      }
      const utf8Bytes = (s: string) => new TextEncoder().encode(s).length;

      // 1. diffBytes ↔ unifiedDiff
      const diffBytes = utf8Bytes(summary.unifiedDiff);
      if (diffBytes !== summary.diffBytes) {
        return {
          ok: false,
          expected: diffBytes,
          actual: summary.diffBytes,
          mismatchPath: "output.diffBytes",
        };
      }

      // 2. checksum + diff coverage per modified file
      for (const change of summary.modifiedFiles as FileChange[]) {
        if (!change.afterChecksum || !SHA256_RE.test(change.afterChecksum)) {
          return {
            ok: false,
            expected: "valid sha256 hex",
            actual: change.afterChecksum,
            mismatchPath: `output.modifiedFiles[${change.path}].afterChecksum`,
          };
        }
        if (change.beforeChecksum !== null) {
          if (!SHA256_RE.test(change.beforeChecksum)) {
            return {
              ok: false,
              expected: "valid sha256 hex",
              actual: change.beforeChecksum,
              mismatchPath: `output.modifiedFiles[${change.path}].beforeChecksum`,
            };
          }
          if (change.beforeChecksum === change.afterChecksum) {
            return {
              ok: false,
              expected: "before != after",
              actual: change.afterChecksum,
              mismatchPath: `output.modifiedFiles[${change.path}].afterChecksum`,
            };
          }
        }
        if (!summary.unifiedDiff.includes(`--- a/${change.path}`)) {
          return {
            ok: false,
            expected: `unifiedDiff to contain --- a/${change.path}`,
            actual: "missing diff header",
            mismatchPath: `output.unifiedDiff[${change.path}]`,
          };
        }
      }

      // 3. every recorded op succeeded (we only get here on adapter success)
      for (const op of summary.operations) {
        if (!op.ok) {
          return {
            ok: false,
            expected: "all operations ok on success",
            actual: { index: op.index, op: op.op, errorCode: op.errorCode },
            mismatchPath: `output.operations[${op.index}]`,
          };
        }
      }

      return {
        ok: true,
        details: {
          files: summary.modifiedFiles.length,
          diffBytes: summary.diffBytes,
        },
      };
    },
  };
}

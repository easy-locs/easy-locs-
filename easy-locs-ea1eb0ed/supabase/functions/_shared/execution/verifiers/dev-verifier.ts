/**
 * dev-verifier — LC6 (task #877).
 *
 * Strict, deterministic verifier for `domain: 'code'` tasks. The orchestrator
 * runs this AFTER the adapter reports apparent success: a code-edit (or any
 * other dev task) is only allowed to settle into `succeeded` when the
 * surrounding build / test / typecheck signals are *all* green.
 *
 * Contract (rejected as VERIFICATION_MISMATCH on any of the following):
 *   1. The adapter reported a `build.run` outcome with `status === "failed"`
 *      or a non-zero `exitCode`.
 *   2. The adapter reported a `test.run` outcome with `failed > 0` or
 *      `status === "failed"`.
 *   3. The adapter reported a typecheck outcome with `status === "failed"`
 *      or `errors > 0`.
 *
 * The verifier inspects two shapes:
 *   (a) `executionResult.output.dev_verification.{build,test,typecheck}`
 *       — preferred; what the LC1 code-edit adapter writes.
 *   (b) `executionResult.output.{build,test,typecheck}` — flat fallback.
 *
 * The verifier is intentionally deterministic — no AI, no side effects, no
 * I/O. A missing signal is treated as "not asserted" and does not fail the
 * task by itself. Strict-mode callers can pass `{ requireAll: true }` so a
 * missing build/test/typecheck signal is itself a mismatch (LC9 will use
 * this once the dev pipeline always emits all three).
 */

import type {
  TaskVerifier,
  VerifierResult,
} from "../verifier-registry.ts";
import type { ExecutionTask } from "../types.ts";

export const DEV_VERIFIER_DOMAIN = "code";

/** Canonical task type shipped by LC1 (code.edit). */
// Mirrors `CODE_TASK_TYPES.EDIT` in the LC1 adapter (`code.edit`). Kept as a
// literal here to keep the verifiers/ folder import-graph free of adapter
// imports — the bootstrap wires the real constant via `{ taskType: ... }`.
export const DEV_VERIFIER_DEFAULT_TASK_TYPE = "code.edit";

export interface DevVerifierOptions {
  /** Domain to register against. Defaults to `"code"`. */
  domain?: string;
  /** Task type to register against. Defaults to `"CODE_EDIT"`. */
  taskType?: string;
  /**
   * When true, the verifier rejects a task that does not assert *all three*
   * of build / test / typecheck. Default false: a missing signal is OK.
   */
  requireAll?: boolean;
}

interface BuildSignal {
  status?: string | null;
  exitCode?: number | null;
  failed?: number | null;
}
interface TestSignal {
  status?: string | null;
  exitCode?: number | null;
  failed?: number | null;
}
interface TypecheckSignal {
  status?: string | null;
  exitCode?: number | null;
  errors?: number | null;
}

interface DevSignals {
  build: BuildSignal | null;
  test: TestSignal | null;
  typecheck: TypecheckSignal | null;
}

function unwrap(executionResult: Record<string, unknown>): Record<string, unknown> {
  const out = executionResult.output;
  if (out && typeof out === "object") return out as Record<string, unknown>;
  return executionResult;
}

function readSignal<T>(source: Record<string, unknown>, key: string): T | null {
  const raw = source[key];
  if (raw && typeof raw === "object") return raw as T;
  return null;
}

function extractSignals(executionResult: Record<string, unknown>): DevSignals {
  const r = unwrap(executionResult);
  const grouped = readSignal<Record<string, unknown>>(r, "dev_verification");
  const source = grouped ?? r;
  return {
    build: readSignal<BuildSignal>(source, "build"),
    test: readSignal<TestSignal>(source, "test"),
    typecheck: readSignal<TypecheckSignal>(source, "typecheck"),
  };
}

function buildFailed(s: BuildSignal | null): boolean {
  if (!s) return false;
  if (s.status && String(s.status).toLowerCase() === "failed") return true;
  if (typeof s.exitCode === "number" && s.exitCode !== 0) return true;
  if (typeof s.failed === "number" && s.failed > 0) return true;
  return false;
}

function testFailed(s: TestSignal | null): boolean {
  if (!s) return false;
  if (s.status && String(s.status).toLowerCase() === "failed") return true;
  if (typeof s.exitCode === "number" && s.exitCode !== 0) return true;
  if (typeof s.failed === "number" && s.failed > 0) return true;
  return false;
}

function typecheckFailed(s: TypecheckSignal | null): boolean {
  if (!s) return false;
  if (s.status && String(s.status).toLowerCase() === "failed") return true;
  if (typeof s.exitCode === "number" && s.exitCode !== 0) return true;
  if (typeof s.errors === "number" && s.errors > 0) return true;
  return false;
}

/**
 * Pure evaluator — exported for unit-tests so the rule list is a single
 * source of truth between the verifier and the LC9 governance suite.
 */
export function evaluateDevSignals(
  signals: DevSignals,
  opts: { requireAll?: boolean } = {},
): { ok: true } | { ok: false; mismatchPath: string; reason: string } {
  if (buildFailed(signals.build)) {
    return { ok: false, mismatchPath: "build", reason: "build.run failed" };
  }
  if (testFailed(signals.test)) {
    return { ok: false, mismatchPath: "test", reason: "test.run reported failures" };
  }
  if (typecheckFailed(signals.typecheck)) {
    return { ok: false, mismatchPath: "typecheck", reason: "typecheck failed" };
  }
  if (opts.requireAll) {
    if (!signals.build) {
      return { ok: false, mismatchPath: "build", reason: "build.run signal missing" };
    }
    if (!signals.test) {
      return { ok: false, mismatchPath: "test", reason: "test.run signal missing" };
    }
    if (!signals.typecheck) {
      return { ok: false, mismatchPath: "typecheck", reason: "typecheck signal missing" };
    }
  }
  return { ok: true };
}

export function createDevVerifier(opts: DevVerifierOptions = {}): TaskVerifier {
  const domain = opts.domain ?? DEV_VERIFIER_DOMAIN;
  const taskType = opts.taskType ?? DEV_VERIFIER_DEFAULT_TASK_TYPE;
  const requireAll = opts.requireAll === true;

  return {
    domain,
    taskType,

    async verify(
      task: ExecutionTask,
      executionResult: Record<string, unknown>,
    ): Promise<VerifierResult> {
      const signals = extractSignals(executionResult);
      const verdict = evaluateDevSignals(signals, { requireAll });
      if (verdict.ok) {
        return {
          ok: true,
          details: {
            task_id: task.id,
            asserted: {
              build: !!signals.build,
              test: !!signals.test,
              typecheck: !!signals.typecheck,
            },
          },
        };
      }
      return {
        ok: false,
        expected: { [verdict.mismatchPath]: "passing" },
        actual: {
          [verdict.mismatchPath]:
            (signals as unknown as Record<string, unknown>)[verdict.mismatchPath] ?? null,
        },
        mismatchPath: verdict.mismatchPath,
        details: {
          task_id: task.id,
          reason: verdict.reason,
          signals,
        },
      };
    },
  };
}

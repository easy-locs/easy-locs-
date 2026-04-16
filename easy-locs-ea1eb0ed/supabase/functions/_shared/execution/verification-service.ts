/**
 * TaskVerificationService — Phase-2 Verification Layer (task #753).
 *
 * The orchestrator calls `run(task, executionResult)` right after an
 * adapter reports apparent success. The service:
 *
 *   1. Optionally sleeps for a small propagation window (default 0, hard-
 *      clamped to MAX_VERIFICATION_WINDOW_MS = 2000).
 *   2. Looks up the verifier registered for `(task.domain, task.type)`.
 *      - Missing verifier → returns `{ kind: "no_verifier" }`. The
 *        orchestrator MUST transition the task to `blocked` with
 *        `error_code = NO_VERIFIER`. Un-verified success is refused.
 *   3. Runs the verifier.
 *      - ok           → `{ kind: "ok", verification }`
 *      - mismatch     → `{ kind: "mismatch", verification, expected, actual, mismatchPath }`
 *      - verifier threw → `{ kind: "threw", error, verification }`
 *
 * The service does NOT write to the DB or emit events — the orchestrator is
 * the sole owner of persistence and the canonical event stream. It only
 * produces a `VerificationDecision` + a structured JSONB payload the
 * orchestrator merges into `execution_result.verification`.
 */

import type { ExecutionTask } from "./types.ts";
import {
  globalVerifierRegistry,
  type VerifierRegistry,
  type VerifierResult,
} from "./verifier-registry.ts";

// ── Error codes ──────────────────────────────────────────────────────────
export const VERIFICATION_ERROR_CODES = {
  NO_VERIFIER: "NO_VERIFIER",
  VERIFICATION_MISMATCH: "VERIFICATION_MISMATCH",
  VERIFIER_THREW: "VERIFIER_THREW",
} as const;

export type VerificationErrorCode =
  (typeof VERIFICATION_ERROR_CODES)[keyof typeof VERIFICATION_ERROR_CODES];

// ── Decision ─────────────────────────────────────────────────────────────
export type VerificationDecision =
  | {
      kind: "no_verifier";
      verification: Record<string, unknown>;
      errorCode: "NO_VERIFIER";
      reason: string;
    }
  | {
      kind: "ok";
      verification: Record<string, unknown>;
      details?: Record<string, unknown>;
    }
  | {
      kind: "mismatch";
      verification: Record<string, unknown>;
      expected: unknown;
      actual: unknown;
      mismatchPath: string;
      details?: Record<string, unknown>;
      errorCode: "VERIFICATION_MISMATCH";
    }
  | {
      kind: "threw";
      verification: Record<string, unknown>;
      error: string;
      errorCode: "VERIFIER_THREW";
    };

// ── Options ──────────────────────────────────────────────────────────────
export interface VerificationRunOptions {
  /**
   * Propagation-absorption delay, in ms. Default 0. Hard-clamped to
   * MAX_VERIFICATION_WINDOW_MS. A non-zero window is a smell that the
   * mutation is not read-your-writes consistent — use sparingly.
   */
  windowMs?: number;
}

export const MAX_VERIFICATION_WINDOW_MS = 2_000;

// ── Helpers ──────────────────────────────────────────────────────────────
function clampWindowMs(input: number | undefined): number {
  if (!input || !Number.isFinite(input) || input <= 0) return 0;
  return Math.min(Math.floor(input), MAX_VERIFICATION_WINDOW_MS);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Service ──────────────────────────────────────────────────────────────
export class TaskVerificationService {
  constructor(
    private readonly registry: VerifierRegistry = globalVerifierRegistry,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async run(
    task: ExecutionTask,
    executionResult: Record<string, unknown>,
    options: VerificationRunOptions = {},
  ): Promise<VerificationDecision> {
    const windowMs = clampWindowMs(options.windowMs);
    if (windowMs > 0) await sleep(windowMs);

    const verifier = this.registry.get(task.domain, task.type);
    const checkedAt = this.now().toISOString();

    if (!verifier) {
      const reason =
        `no verifier registered for (${task.domain}, ${task.type}); ` +
        `un-verified success is refused by policy`;
      return {
        kind: "no_verifier",
        errorCode: "NO_VERIFIER",
        reason,
        verification: {
          ok: false,
          error_code: VERIFICATION_ERROR_CODES.NO_VERIFIER,
          reason,
          checked_at: checkedAt,
        },
      };
    }

    let result: VerifierResult;
    try {
      result = await verifier.verify(task, executionResult);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      return {
        kind: "threw",
        errorCode: "VERIFIER_THREW",
        error: message,
        verification: {
          ok: false,
          error_code: VERIFICATION_ERROR_CODES.VERIFIER_THREW,
          error: message,
          checked_at: checkedAt,
        },
      };
    }

    if (result.ok) {
      return {
        kind: "ok",
        details: result.details,
        verification: {
          ok: true,
          checked_at: checkedAt,
          ...(result.details ? { details: result.details } : {}),
        },
      };
    }

    return {
      kind: "mismatch",
      errorCode: "VERIFICATION_MISMATCH",
      expected: result.expected,
      actual: result.actual,
      mismatchPath: result.mismatchPath,
      details: result.details,
      verification: {
        ok: false,
        error_code: VERIFICATION_ERROR_CODES.VERIFICATION_MISMATCH,
        expected: result.expected,
        actual: result.actual,
        mismatch_path: result.mismatchPath,
        checked_at: checkedAt,
        ...(result.details ? { details: result.details } : {}),
      },
    };
  }
}

/** Default service wired to the shared registry. */
export const taskVerificationService = new TaskVerificationService();

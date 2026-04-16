/**
 * TaskVerificationService — Phase-2 Verification Layer (task #753).
 *
 * Runs after an adapter's apparent success and BEFORE the task is allowed to
 * transition to `succeeded`. The service:
 *
 *   1. Optionally waits a small verification window (propagation / replication
 *      absorption). Default 0ms, clamped to <= 2 seconds.
 *   2. Looks up the verifier registered for `(task.domain, task.type)`.
 *      - Missing verifier → task BLOCKED with `error_code = NO_VERIFIER`.
 *        Success without a verifier is a non-negotiable refusal.
 *   3. Invokes `verifier.verify(task, executionResult)`.
 *      - `ok: true`  → task SUCCEEDED; verification payload persisted.
 *      - `ok: false` → task FAILED with `error_code = VERIFICATION_MISMATCH`;
 *        structured diff persisted; `task.verification_failed` emitted.
 *
 * Persistence: the SQL schema (migration 20260418500000_execution_tasks_v2)
 * exposes `execution_result JSONB`, `error_code TEXT`, `error TEXT`. The
 * verification payload is stored under `execution_result.verification` so it
 * is queryable and travels with the rest of the execution envelope without
 * requiring a new column.
 *
 * This service is deliberately transport-agnostic: it is handed a `persister`
 * that knows how to update a task row. The production wiring (edge function /
 * orchestrator v2) injects the Supabase-backed persister; unit tests inject
 * an in-memory one.
 */

import { platformBus } from "@/lib/platform-bus";
import type { ExecutionTaskRow } from "./types";
import {
  verifierRegistry as defaultRegistry,
  type VerifierRegistry,
  type VerifierResult,
} from "./verifier";

// ── Canonical event name ─────────────────────────────────────────────────
/**
 * Emitted on the platform bus when a verifier returns `ok: false`. The
 * orchestrator's canonical event dictionary (phase-2 block 3) re-exports
 * this constant so adapters and dashboards share one source of truth.
 */
export const TASK_VERIFICATION_FAILED_EVENT = "task.verification_failed";

// ── Error codes ──────────────────────────────────────────────────────────
export const VERIFICATION_ERROR_CODES = {
  NO_VERIFIER: "NO_VERIFIER",
  VERIFICATION_MISMATCH: "VERIFICATION_MISMATCH",
  VERIFIER_THREW: "VERIFIER_THREW",
} as const;

export type VerificationErrorCode =
  (typeof VERIFICATION_ERROR_CODES)[keyof typeof VERIFICATION_ERROR_CODES];

// ── Outcomes ─────────────────────────────────────────────────────────────
export type VerificationOutcome =
  | {
      status: "succeeded";
      verifierResult: Extract<VerifierResult, { ok: true }>;
      persisted: Record<string, unknown>;
    }
  | {
      status: "failed";
      errorCode: "VERIFICATION_MISMATCH" | "VERIFIER_THREW";
      verifierResult: Extract<VerifierResult, { ok: false }> | null;
      error: string;
      persisted: Record<string, unknown>;
    }
  | {
      status: "blocked";
      errorCode: "NO_VERIFIER";
      error: string;
      persisted: Record<string, unknown>;
    };

// ── Persister contract ───────────────────────────────────────────────────
export interface VerificationPersistPatch {
  status: "succeeded" | "failed" | "blocked";
  error_code: string | null;
  error: string | null;
  execution_result: Record<string, unknown>;
  blocked_reason: string | null;
}

export interface VerificationPersister {
  apply(taskId: string, patch: VerificationPersistPatch): Promise<void>;
}

// ── Options ──────────────────────────────────────────────────────────────
export interface VerificationRunOptions {
  /**
   * Optional propagation window (ms). The service sleeps for this duration
   * BEFORE invoking the verifier, to absorb replication / eventual-
   * consistency lag. Default 0, hard-clamped to `MAX_VERIFICATION_WINDOW_MS`.
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

function mergeExecutionResult(
  executionResult: Record<string, unknown>,
  verification: Record<string, unknown>,
): Record<string, unknown> {
  return { ...executionResult, verification };
}

// ── Service ──────────────────────────────────────────────────────────────
export class TaskVerificationService {
  constructor(
    private readonly registry: VerifierRegistry = defaultRegistry,
    private readonly persister: VerificationPersister | null = null,
    private readonly bus: Pick<typeof platformBus, "emit"> = platformBus,
  ) {}

  /**
   * Run verification for a task that the adapter reported as successful.
   * Persists the outcome via the injected persister (if any) and emits the
   * canonical `task.verification_failed` event on mismatch.
   */
  async run(
    task: ExecutionTaskRow,
    executionResult: Record<string, unknown>,
    options: VerificationRunOptions = {},
  ): Promise<VerificationOutcome> {
    const windowMs = clampWindowMs(options.windowMs);
    if (windowMs > 0) await sleep(windowMs);

    const verifier = this.registry.get(task.domain, task.type);

    // ── No verifier registered → refuse success ─────────────────────────
    if (!verifier) {
      const reason =
        `no verifier registered for (${task.domain}, ${task.type}); ` +
        `un-verified success is refused by policy`;
      const payload = mergeExecutionResult(executionResult, {
        ok: false,
        error_code: VERIFICATION_ERROR_CODES.NO_VERIFIER,
        reason,
        checked_at: new Date().toISOString(),
      });
      const patch: VerificationPersistPatch = {
        status: "blocked",
        error_code: VERIFICATION_ERROR_CODES.NO_VERIFIER,
        error: reason,
        execution_result: payload,
        blocked_reason: reason,
      };
      await this.safePersist(task.id, patch);
      return {
        status: "blocked",
        errorCode: "NO_VERIFIER",
        error: reason,
        persisted: payload,
      };
    }

    // ── Run the verifier ────────────────────────────────────────────────
    let result: VerifierResult;
    try {
      result = await verifier.verify(task, executionResult);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      const payload = mergeExecutionResult(executionResult, {
        ok: false,
        error_code: VERIFICATION_ERROR_CODES.VERIFIER_THREW,
        error: message,
        checked_at: new Date().toISOString(),
      });
      const patch: VerificationPersistPatch = {
        status: "failed",
        error_code: VERIFICATION_ERROR_CODES.VERIFIER_THREW,
        error: `verifier threw: ${message}`,
        execution_result: payload,
        blocked_reason: null,
      };
      await this.safePersist(task.id, patch);
      this.emitFailed(task, {
        ok: false,
        expected: null,
        actual: null,
        mismatchPath: "<verifier_threw>",
        details: { message },
      });
      return {
        status: "failed",
        errorCode: "VERIFIER_THREW",
        verifierResult: null,
        error: message,
        persisted: payload,
      };
    }

    // ── Success path ────────────────────────────────────────────────────
    if (result.ok) {
      const payload = mergeExecutionResult(executionResult, {
        ok: true,
        checked_at: new Date().toISOString(),
        ...(result.details ? { details: result.details } : {}),
      });
      const patch: VerificationPersistPatch = {
        status: "succeeded",
        error_code: null,
        error: null,
        execution_result: payload,
        blocked_reason: null,
      };
      await this.safePersist(task.id, patch);
      return { status: "succeeded", verifierResult: result, persisted: payload };
    }

    // ── Mismatch path ───────────────────────────────────────────────────
    const structuredDiff = {
      ok: false,
      error_code: VERIFICATION_ERROR_CODES.VERIFICATION_MISMATCH,
      expected: result.expected,
      actual: result.actual,
      mismatch_path: result.mismatchPath,
      checked_at: new Date().toISOString(),
      ...(result.details ? { details: result.details } : {}),
    };
    const payload = mergeExecutionResult(executionResult, structuredDiff);
    const patch: VerificationPersistPatch = {
      status: "failed",
      error_code: VERIFICATION_ERROR_CODES.VERIFICATION_MISMATCH,
      error: `VERIFICATION_MISMATCH at "${result.mismatchPath}"`,
      execution_result: payload,
      blocked_reason: null,
    };
    await this.safePersist(task.id, patch);
    this.emitFailed(task, result);
    return {
      status: "failed",
      errorCode: "VERIFICATION_MISMATCH",
      verifierResult: result,
      error: patch.error!,
      persisted: payload,
    };
  }

  private async safePersist(
    taskId: string,
    patch: VerificationPersistPatch,
  ): Promise<void> {
    if (!this.persister) return;
    await this.persister.apply(taskId, patch);
  }

  private emitFailed(
    task: ExecutionTaskRow,
    result: Extract<VerifierResult, { ok: false }>,
  ): void {
    try {
      this.bus.emit(
        TASK_VERIFICATION_FAILED_EVENT,
        "system",
        {
          task_id: task.id,
          domain: task.domain,
          task_type: task.type,
          expected: result.expected,
          actual: result.actual,
          mismatch_path: result.mismatchPath,
          correlation_id: task.correlation_id ?? null,
          root_task_id: task.root_task_id ?? null,
          entity_type: task.entity_type ?? null,
          entity_id: task.entity_id ?? null,
        },
        {
          trace_id: task.correlation_id ?? undefined,
        },
      );
    } catch {
      // Bus failures are non-fatal — the DB is the source of truth for the
      // failed status + diff. Swallow here rather than masking the original
      // verification outcome.
    }
  }
}

/** Default service wired to the shared registry; no persister attached. */
export const taskVerificationService = new TaskVerificationService();

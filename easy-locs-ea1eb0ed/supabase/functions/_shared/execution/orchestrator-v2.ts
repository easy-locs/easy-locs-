/**
 * ExecutionOrchestratorV2 — Phase-2 deterministic execution pipeline
 * (task #752).
 *
 * Strict, non-skippable order of operations:
 *
 *   validate → authorize → lock → idempotency-check → execute →
 *   verify (placeholder) → emit events → persist result → unlock
 *
 * The orchestrator is the ONLY component allowed to transition a task's
 * status. Adapters return AdapterResult; everything else (status writes,
 * event emission, lock release, idempotency cache hit) is owned here.
 *
 * Hard guarantees:
 *   - Every step that runs emits exactly one canonical event.
 *   - Errors are surfaced as structured `error_code` / `error_message` —
 *     never swallowed.
 *   - Locks are released in `finally` no matter what the adapter does.
 *   - An idempotency hit returns the cached result without invoking the
 *     adapter (no duplicate side-effects on retry).
 *   - A task without a registered adapter ends up `blocked` with
 *     `error_code = NO_ADAPTER`.
 */

import {
  CANONICAL_EXECUTION_EVENTS,
  type CanonicalExecutionEvent,
  type ExecutionEventSink,
} from "./canonical-events.ts";
import {
  AdapterRegistry,
  defaultIdempotencyKey,
  defaultLockKey,
} from "./adapter-registry.ts";
import type { LockService } from "./lock-service.ts";
import type { IdempotencyService } from "./idempotency-service.ts";
import type { TaskRepository } from "./persistence.ts";
import {
  ORCHESTRATOR_ERROR_CODES,
  type AdapterResult,
  type DomainAdapter,
  type ExecutionTask,
  type OrchestrationOutcome,
  type OrchestratorErrorCode,
} from "./types.ts";
import {
  TaskVerificationService,
  VERIFICATION_ERROR_CODES,
  type VerificationDecision,
  type VerificationRunOptions,
} from "./verification-service.ts";
import type { HeartbeatEmitter } from "./heartbeat-emitter.ts";

export interface ValidationGate {
  validate(
    task: ExecutionTask,
  ): Promise<{ ok: boolean; reason?: string; code?: string }>;
}

export interface OrchestratorDeps {
  registry: AdapterRegistry;
  repository: TaskRepository;
  locks: LockService;
  idempotency: IdempotencyService;
  validator: ValidationGate;
  sink: ExecutionEventSink;
  /**
   * Verification service (task #753). If omitted, a service wired to the
   * global verifier registry is used. An adapter with no registered
   * verifier will cause its tasks to be blocked with
   * `error_code = NO_VERIFIER`.
   */
  verification?: TaskVerificationService;
  /** Default verification options applied to every run. */
  verificationOptions?: VerificationRunOptions;
  ownerId: string;
  lockTtlSeconds?: number;
  now?: () => Date;
  /**
   * Sovereign Agent Control · L2 (task #810). Optional heartbeat emitter
   * pinned to this worker. The orchestrator pings it immediately on every
   * task accept and complete so the in-flight count reflected in
   * `system.agent_heartbeats` is fresh without waiting for the next tick.
   * Heartbeat failure is best-effort — it never affects task execution.
   *
   * Lifecycle (start/stop) is owned by the worker process, not by the
   * orchestrator: an emitter is shared across many `run()` calls.
   */
  heartbeat?: HeartbeatEmitter;
}

export class ExecutionOrchestratorV2 {
  private readonly lockTtlSeconds: number;
  private readonly now: () => Date;
  private readonly verification: TaskVerificationService;
  private readonly verificationOptions: VerificationRunOptions;
  // Per-run accumulator for event-sink failures. Reset at the top of every
  // `run()` so failures are not silently lost — they are surfaced on the
  // returned OrchestrationOutcome (`sinkErrors` field).
  private currentSinkErrors: string[] = [];

  constructor(private readonly deps: OrchestratorDeps) {
    this.lockTtlSeconds = deps.lockTtlSeconds ?? 60;
    this.now = deps.now ?? (() => new Date());
    this.verification = deps.verification ?? new TaskVerificationService();
    this.verificationOptions = deps.verificationOptions ?? {};
  }

  /**
   * run — entry point. Loads the task and walks the pipeline. Always
   * returns an OrchestrationOutcome; never throws for adapter errors.
   */
  async run(taskId: string): Promise<OrchestrationOutcome> {
    const startedAt = Date.now();
    this.currentSinkErrors = [];

    let task = await this.deps.repository.loadTask(taskId);
    if (!task) {
      return {
        taskId,
        finalStatus: "blocked",
        errorCode: ORCHESTRATOR_ERROR_CODES.TASK_NOT_FOUND,
        errorMessage: `Task ${taskId} not found`,
        durationMs: Date.now() - startedAt,
        sinkErrors: this.currentSinkErrors.slice(),
      };
    }

    if (task.status !== "queued" && task.status !== "approved") {
      return {
        taskId,
        finalStatus: "blocked",
        errorCode: ORCHESTRATOR_ERROR_CODES.ILLEGAL_STATUS,
        errorMessage:
          `Orchestrator refuses task in status "${task.status}"; ` +
          `only "queued" or "approved" are accepted`,
        durationMs: Date.now() - startedAt,
        sinkErrors: this.currentSinkErrors.slice(),
      };
    }

    // Normalize approved → queued before any further work. The SQL state
    // machine forbids approved→{blocked,running,failed} directly: only
    // approved→queued (or →cancelled) is legal. Every downstream branch
    // therefore requires the task to be `queued` first.
    if (task.status === "approved") {
      const normalized = await this.deps.repository.transition(
        task.id,
        "approved",
        "queued",
      );
      if (!normalized) {
        const message = `Could not normalize approved→queued for task ${task.id}`;
        return {
          taskId,
          finalStatus: "blocked",
          errorCode: ORCHESTRATOR_ERROR_CODES.PERSIST_FAILED,
          errorMessage: message,
          durationMs: Date.now() - startedAt,
          sinkErrors: this.currentSinkErrors.slice(),
        };
      }
      task = { ...task, status: "queued" };
    }

    await this.emit(task, CANONICAL_EXECUTION_EVENTS.TASK_QUEUED, {
      attempt: task.attempt_count + 1,
    });

    // ── Step 1: validate ────────────────────────────────────────────────
    const validation = await this.deps.validator.validate(task);
    if (!validation.ok) {
      await this.markBlocked(task, {
        code: validation.code ?? ORCHESTRATOR_ERROR_CODES.VALIDATION_FAILED,
        message: validation.reason ?? "Validation gate rejected the task",
      });
      return this.outcome(task, "blocked", startedAt, {
        errorCode: validation.code ?? ORCHESTRATOR_ERROR_CODES.VALIDATION_FAILED,
        errorMessage: validation.reason ?? "Validation gate rejected the task",
      });
    }

    // ── Step 2: authorize ───────────────────────────────────────────────
    if (task.requires_approval && (!task.approved_by || task.approved_by.trim() === "")) {
      const message = "Task requires approval but no approver is recorded";
      await this.markBlocked(task, {
        code: ORCHESTRATOR_ERROR_CODES.AUTHORIZATION_FAILED,
        message,
      });
      return this.outcome(task, "blocked", startedAt, {
        errorCode: ORCHESTRATOR_ERROR_CODES.AUTHORIZATION_FAILED,
        errorMessage: message,
      });
    }

    // Adapter lookup happens before lock so we never hold a lock for a task
    // we cannot execute.
    const adapter: DomainAdapter | null = this.deps.registry.get(task.domain, task.type);
    if (!adapter) {
      const message =
        `No adapter registered for (domain="${task.domain}", task_type="${task.type}")`;
      await this.markBlocked(task, {
        code: ORCHESTRATOR_ERROR_CODES.NO_ADAPTER,
        message,
      });
      return this.outcome(task, "blocked", startedAt, {
        errorCode: ORCHESTRATOR_ERROR_CODES.NO_ADAPTER,
        errorMessage: message,
      });
    }

    const lockKey = adapter.getLockKey ? adapter.getLockKey(task) : defaultLockKey(task);
    const idemKey = adapter.getIdempotencyKey
      ? adapter.getIdempotencyKey(task)
      : defaultIdempotencyKey(task);

    // ── Step 3: lock ────────────────────────────────────────────────────
    const acquired = await this.deps.locks.acquire(lockKey, this.deps.ownerId, this.lockTtlSeconds);
    if (!acquired) {
      const message = `Could not acquire lock "${lockKey}" within TTL`;
      // Lock contention is transient: surface as `failed` so retry policy
      // (block 1) can re-queue; do not emit verification_skipped.
      await this.transitionToRunningThenFailed(task, {
        code: ORCHESTRATOR_ERROR_CODES.LOCK_TIMEOUT,
        message,
      });
      return this.outcome(task, "failed", startedAt, {
        errorCode: ORCHESTRATOR_ERROR_CODES.LOCK_TIMEOUT,
        errorMessage: message,
      });
    }

    await this.emit(task, CANONICAL_EXECUTION_EVENTS.TASK_LOCKED, { lockKey });
    // L2 — refresh the heartbeat so in_flight reflects this task accept.
    this.pingHeartbeat();

    let outcome: OrchestrationOutcome;
    try {
      // ── Step 4: idempotency short-circuit ─────────────────────────────
      if (idemKey) {
        let existing: Record<string, unknown> | null;
        try {
          existing = await this.deps.idempotency.findExistingResult(idemKey);
        } catch (e) {
          // Hard fail: we cannot prove the side-effect has not already
          // committed for this key, so we MUST NOT execute the adapter.
          // Mark the task blocked with an explicit error_code so the
          // operator can investigate. Lock release happens in finally.
          const message = e instanceof Error ? e.message : String(e);
          await this.deps.repository.transition(task.id, task.status, "blocked", {
            error_code: ORCHESTRATOR_ERROR_CODES.IDEMPOTENCY_LOOKUP_FAILED,
            blocked_reason: `Idempotency lookup failed for key ${idemKey}: ${message}`,
          });
          await this.emit(task, CANONICAL_EXECUTION_EVENTS.TASK_BLOCKED, {
            errorCode: ORCHESTRATOR_ERROR_CODES.IDEMPOTENCY_LOOKUP_FAILED,
            errorMessage: message,
          });
          outcome = this.outcome(task, "blocked", startedAt, {
            errorCode: ORCHESTRATOR_ERROR_CODES.IDEMPOTENCY_LOOKUP_FAILED,
            errorMessage: message,
          });
          return outcome;
        }
        if (existing) {
          await this.emit(task, CANONICAL_EXECUTION_EVENTS.TASK_IDEMPOTENT_HIT, {
            idempotencyKey: idemKey,
          });
          // Persist a no-op success so the current task row also reflects the
          // outcome (audit-friendly), but DO NOT invoke the adapter.
          const ok = await this.transitionRunningThenSucceeded(task, {
            output: existing,
            idempotent: true,
          });
          if (!ok) {
            outcome = this.outcome(task, "blocked", startedAt, {
              errorCode: ORCHESTRATOR_ERROR_CODES.PERSIST_FAILED,
              errorMessage: "Failed to persist idempotent success",
            });
          } else {
            outcome = this.outcome(task, "succeeded", startedAt, {
              result: existing,
              idempotent: true,
            });
          }
          return outcome;
        }
      }

      // ── Step 5: execute ────────────────────────────────────────────────
      const claimed = await this.deps.repository.transition(
        task.id,
        task.status,
        "running",
        { attempt_count: task.attempt_count + 1 },
      );
      if (!claimed) {
        outcome = this.outcome(task, "blocked", startedAt, {
          errorCode: ORCHESTRATOR_ERROR_CODES.ILLEGAL_STATUS,
          errorMessage:
            `Could not transition task ${task.id} ${task.status}→running ` +
            `(claimed by another orchestrator?)`,
        });
        return outcome;
      }

      await this.emit(task, CANONICAL_EXECUTION_EVENTS.TASK_STARTED, {
        attempt: task.attempt_count + 1,
        lockKey,
      });

      let adapterResult: AdapterResult;
      try {
        adapterResult = await adapter.execute({
          task,
          lockKey,
          ownerId: this.deps.ownerId,
          attempt: task.attempt_count + 1,
          startedAt: this.now().toISOString(),
        });
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        await this.deps.repository.transition(task.id, "running", "failed", {
          error_code: ORCHESTRATOR_ERROR_CODES.ADAPTER_THREW,
          execution_result: { error: message },
        });
        await this.emit(task, CANONICAL_EXECUTION_EVENTS.TASK_FAILED, {
          errorCode: ORCHESTRATOR_ERROR_CODES.ADAPTER_THREW,
          errorMessage: message,
        });
        outcome = this.outcome(task, "failed", startedAt, {
          errorCode: ORCHESTRATOR_ERROR_CODES.ADAPTER_THREW,
          errorMessage: message,
        });
        return outcome;
      }

      // ── Adapter reported failure → fail fast, skip verification ───────
      if (!adapterResult.success) {
        const code = adapterResult.errorCode ?? ORCHESTRATOR_ERROR_CODES.ADAPTER_FAILED;
        const message = adapterResult.errorMessage ?? "Adapter reported failure";
        await this.deps.repository.transition(task.id, "running", "failed", {
          error_code: code,
          execution_result: {
            error: message,
            output: adapterResult.output ?? null,
            logs: adapterResult.logs ?? [],
          },
        });
        await this.emit(task, CANONICAL_EXECUTION_EVENTS.TASK_FAILED, {
          errorCode: code,
          errorMessage: message,
        });
        outcome = this.outcome(task, "failed", startedAt, {
          errorCode: code,
          errorMessage: message,
        });
        return outcome;
      }

      // ── Step 6: verify — refuses un-verified success (task #753) ──────
      const adapterPayload: Record<string, unknown> = {
        output: adapterResult.output ?? null,
        logs: adapterResult.logs ?? [],
        actions_taken: adapterResult.actionsTaken ?? [],
      };
      let decision: VerificationDecision;
      try {
        decision = await this.verification.run(
          task,
          adapterPayload,
          this.verificationOptions,
        );
      } catch (e) {
        // The service itself is defensive, but guard regardless so an
        // unexpected throw can never bypass the verify gate.
        const message = e instanceof Error ? e.message : String(e);
        await this.deps.repository.transition(task.id, "running", "failed", {
          error_code: VERIFICATION_ERROR_CODES.VERIFIER_THREW,
          execution_result: {
            ...adapterPayload,
            verification: {
              ok: false,
              error_code: VERIFICATION_ERROR_CODES.VERIFIER_THREW,
              error: message,
              checked_at: this.now().toISOString(),
            },
          },
        });
        await this.emit(task, CANONICAL_EXECUTION_EVENTS.TASK_VERIFICATION_FAILED, {
          errorCode: VERIFICATION_ERROR_CODES.VERIFIER_THREW,
          errorMessage: message,
        });
        await this.emit(task, CANONICAL_EXECUTION_EVENTS.TASK_FAILED, {
          errorCode: VERIFICATION_ERROR_CODES.VERIFIER_THREW,
          errorMessage: message,
        });
        outcome = this.outcome(task, "failed", startedAt, {
          errorCode: VERIFICATION_ERROR_CODES.VERIFIER_THREW,
          errorMessage: message,
        });
        return outcome;
      }

      // No verifier registered → refuse success, block the task.
      if (decision.kind === "no_verifier") {
        await this.deps.repository.transition(task.id, "running", "blocked", {
          error_code: VERIFICATION_ERROR_CODES.NO_VERIFIER,
          blocked_reason: decision.reason,
          execution_result: {
            ...adapterPayload,
            verification: decision.verification,
          },
        });
        await this.emit(task, CANONICAL_EXECUTION_EVENTS.TASK_BLOCKED, {
          errorCode: VERIFICATION_ERROR_CODES.NO_VERIFIER,
          errorMessage: decision.reason,
        });
        outcome = this.outcome(task, "blocked", startedAt, {
          errorCode: VERIFICATION_ERROR_CODES.NO_VERIFIER,
          errorMessage: decision.reason,
        });
        return outcome;
      }

      // Verifier threw → fail the task with the VERIFIER_THREW error code.
      if (decision.kind === "threw") {
        await this.deps.repository.transition(task.id, "running", "failed", {
          error_code: VERIFICATION_ERROR_CODES.VERIFIER_THREW,
          execution_result: {
            ...adapterPayload,
            verification: decision.verification,
          },
        });
        await this.emit(task, CANONICAL_EXECUTION_EVENTS.TASK_VERIFICATION_FAILED, {
          errorCode: VERIFICATION_ERROR_CODES.VERIFIER_THREW,
          errorMessage: decision.error,
        });
        await this.emit(task, CANONICAL_EXECUTION_EVENTS.TASK_FAILED, {
          errorCode: VERIFICATION_ERROR_CODES.VERIFIER_THREW,
          errorMessage: decision.error,
        });
        outcome = this.outcome(task, "failed", startedAt, {
          errorCode: VERIFICATION_ERROR_CODES.VERIFIER_THREW,
          errorMessage: decision.error,
        });
        return outcome;
      }

      // Verifier reports mismatch → fail the task with VERIFICATION_MISMATCH.
      if (decision.kind === "mismatch") {
        const mismatchMessage = `VERIFICATION_MISMATCH at "${decision.mismatchPath}"`;
        await this.deps.repository.transition(task.id, "running", "failed", {
          error_code: VERIFICATION_ERROR_CODES.VERIFICATION_MISMATCH,
          execution_result: {
            ...adapterPayload,
            verification: decision.verification,
          },
        });
        await this.emit(task, CANONICAL_EXECUTION_EVENTS.TASK_VERIFICATION_FAILED, {
          errorCode: VERIFICATION_ERROR_CODES.VERIFICATION_MISMATCH,
          errorMessage: mismatchMessage,
          expected: decision.expected,
          actual: decision.actual,
          mismatch_path: decision.mismatchPath,
          ...(decision.details ? { details: decision.details } : {}),
        });
        await this.emit(task, CANONICAL_EXECUTION_EVENTS.TASK_FAILED, {
          errorCode: VERIFICATION_ERROR_CODES.VERIFICATION_MISMATCH,
          errorMessage: mismatchMessage,
        });
        outcome = this.outcome(task, "failed", startedAt, {
          errorCode: VERIFICATION_ERROR_CODES.VERIFICATION_MISMATCH,
          errorMessage: mismatchMessage,
        });
        return outcome;
      }

      // Verifier passed → Step 7: persist result + Step 8: emit success.
      const result: Record<string, unknown> = {
        ...adapterPayload,
        verification: decision.verification,
      };
      const ok = await this.deps.repository.transition(task.id, "running", "succeeded", {
        execution_result: result,
        error_code: null,
      });
      if (!ok) {
        outcome = this.outcome(task, "blocked", startedAt, {
          errorCode: ORCHESTRATOR_ERROR_CODES.PERSIST_FAILED,
          errorMessage: "Could not transition running→succeeded",
        });
        return outcome;
      }
      await this.emit(task, CANONICAL_EXECUTION_EVENTS.TASK_VERIFIED, {
        ...(decision.details ? { details: decision.details } : {}),
      });
      await this.emit(task, CANONICAL_EXECUTION_EVENTS.TASK_SUCCEEDED, {
        output: adapterResult.output ?? null,
      });
      outcome = this.outcome(task, "succeeded", startedAt, { result });
      return outcome;
    } finally {
      // Step 9: unlock — ALWAYS, even on unhandled exceptions. A failed
      // release does not invalidate the run, but it MUST be observable so
      // operators can detect a stuck lock — surface it on sinkErrors and
      // emit a dedicated canonical event.
      try {
        const released = await this.deps.locks.release(lockKey, this.deps.ownerId);
        if (released) {
          await this.emit(task, CANONICAL_EXECUTION_EVENTS.TASK_UNLOCKED, { lockKey });
        } else {
          this.currentSinkErrors.push(`UNLOCK_FAILED:${lockKey}:not-owner-or-expired`);
          await this.emit(task, CANONICAL_EXECUTION_EVENTS.TASK_UNLOCKED, {
            lockKey,
            released: false,
            reason: "not-owner-or-expired",
          });
        }
      } catch (e) {
        const detail = e instanceof Error ? e.message : String(e);
        this.currentSinkErrors.push(`UNLOCK_FAILED:${lockKey}:${detail}`);
        console.warn("[orchestrator-v2] unlock error:", lockKey, detail);
      }
      // L2 — refresh the heartbeat so in_flight reflects this completion.
      this.pingHeartbeat();
    }
  }

  /**
   * Best-effort heartbeat ping. NEVER throws and NEVER awaits — the
   * emitter coalesces overlapping calls internally.
   */
  private pingHeartbeat(): void {
    const hb = this.deps.heartbeat;
    if (!hb) return;
    try {
      void hb.emitNow().catch(() => { /* swallow — best-effort */ });
    } catch {
      /* swallow — heartbeat must never affect task execution */
    }
  }

  // ── Internal helpers ──────────────────────────────────────────────────────

  private async emit(
    task: ExecutionTask,
    name: CanonicalExecutionEvent["name"],
    payload: Record<string, unknown>,
  ): Promise<void> {
    const event: CanonicalExecutionEvent = {
      name,
      taskId: task.id,
      domain: task.domain,
      taskType: task.type,
      timestamp: this.now().toISOString(),
      correlationId: task.correlation_id,
      rootTaskId: task.root_task_id,
      payload,
    };
    try {
      await this.deps.sink.emit(event);
    } catch (e) {
      // Sink failures do not break orchestration (state-machine writes are
      // independent of telemetry), but they MUST be observable. We record
      // the failure on the run-scoped accumulator; it surfaces on the
      // returned OrchestrationOutcome.sinkErrors and the caller is
      // responsible for alerting on a non-empty list.
      const detail = e instanceof Error ? e.message : String(e);
      this.currentSinkErrors.push(`${name}:${detail}`);
      console.warn("[orchestrator-v2] event sink error:", name, detail);
    }
  }

  private async markBlocked(
    task: ExecutionTask,
    err: { code: OrchestratorErrorCode | string; message: string },
  ): Promise<void> {
    await this.deps.repository.transition(task.id, task.status, "blocked", {
      blocked_reason: err.message,
      error_code: err.code,
    });
    await this.emit(task, CANONICAL_EXECUTION_EVENTS.TASK_BLOCKED, {
      errorCode: err.code,
      errorMessage: err.message,
    });
  }

  private async transitionToRunningThenFailed(
    task: ExecutionTask,
    err: { code: OrchestratorErrorCode | string; message: string },
  ): Promise<void> {
    const claimed = await this.deps.repository.transition(
      task.id,
      task.status,
      "running",
      { attempt_count: task.attempt_count + 1 },
    );
    if (!claimed) {
      // Couldn't even claim — leave in current state.
      return;
    }
    await this.deps.repository.transition(task.id, "running", "failed", {
      error_code: err.code,
      execution_result: { error: err.message },
    });
    await this.emit(task, CANONICAL_EXECUTION_EVENTS.TASK_FAILED, {
      errorCode: err.code,
      errorMessage: err.message,
    });
  }

  private async transitionRunningThenSucceeded(
    task: ExecutionTask,
    detail: { output: Record<string, unknown>; idempotent: boolean },
  ): Promise<boolean> {
    const claimed = await this.deps.repository.transition(
      task.id,
      task.status,
      "running",
      { attempt_count: task.attempt_count + 1 },
    );
    if (!claimed) return false;
    const ok = await this.deps.repository.transition(task.id, "running", "succeeded", {
      execution_result: {
        output: detail.output,
        idempotent: detail.idempotent,
      },
      error_code: null,
    });
    if (ok) {
      await this.emit(task, CANONICAL_EXECUTION_EVENTS.TASK_SUCCEEDED, {
        output: detail.output,
        idempotent: detail.idempotent,
      });
    }
    return ok;
  }

  private outcome(
    task: ExecutionTask,
    finalStatus: OrchestrationOutcome["finalStatus"],
    startedAt: number,
    extras: Partial<OrchestrationOutcome> = {},
  ): OrchestrationOutcome {
    return {
      taskId: task.id,
      finalStatus,
      durationMs: Date.now() - startedAt,
      sinkErrors: this.currentSinkErrors.slice(),
      ...extras,
    };
  }
}

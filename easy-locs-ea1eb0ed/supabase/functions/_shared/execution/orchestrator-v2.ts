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
  ROLLBACK_ERROR_CODES,
  type AdapterResult,
  type DomainAdapter,
  type ExecutionTask,
  type OrchestrationOutcome,
  type OrchestratorErrorCode,
  type RollbackInvocation,
  type RollbackResult,
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

/**
 * AgentQuotaGate — kind-agnostic pre-execute quota check (LB1 follow-up
 * #834). The orchestrator calls `peek` exactly once per run BEFORE
 * `adapter.execute`; on a block it short-circuits to
 * `blocked` with `error_code = QUOTA_EXCEEDED`. The actual usage bump
 * stays with the adapter (which knows real token / cost figures) so
 * unsuccessful or persist-failed runs do not double-count against the
 * limit.
 *
 * Returns `{ ok: true }` or a structured rejection. The orchestrator
 * skips the gate when `task.agent_id` is null (legacy tasks dispatched
 * before the agent registry was wired) or when the deps do not provide
 * a gate.
 */
export interface AgentQuotaGate {
  peek(args: { agentId: string }): Promise<
    | { ok: true }
    | {
        ok: false;
        reason: string;
        window: string;
        currentCount?: number;
        limitCount?: number;
      }
  >;
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
  /**
   * L3 (#811) — Generic pre-execute snapshotter used when an adapter does
   * not declare its own `snapshotProvider`. The worker process injects an
   * implementation that resolves `task.entity_type` (expected format
   * `"<schema>.<table>"`) and `task.entity_id` to a `SELECT *` against the
   * canonical domain-schema table, returning the row that was about to be
   * mutated. The orchestrator stores the result on `previous_state`.
   *
   * Returning `null` (no entity, missing client, or row not found) is
   * fine — the orchestrator falls back to the structural identity
   * envelope so every rollback-eligible task still has *something*
   * actionable on the row. Throwing is also fine — it is surfaced as a
   * snapshot error event but never blocks the forward execute().
   */
  defaultSnapshotter?: (
    task: ExecutionTask,
  ) => Promise<Record<string, unknown> | null>;
  /**
   * LB1 follow-up #834 — Optional generic quota gate. When provided AND
   * the task carries an `agent_id`, the orchestrator calls `peek` before
   * adapter execution and short-circuits to
   * `blocked / QUOTA_EXCEEDED` on rejection. Adapters never call peek
   * themselves (single source of truth). When omitted, the gate is a
   * no-op (used by tests and legacy harnesses).
   */
  agentQuotaGate?: AgentQuotaGate;
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

    // ── Step 2b: agent quota gate (LB1 #834) ────────────────────────────
    // Generic, kind-agnostic pre-execute check. The adapter still owns
    // the post-call accounting bump; this gate is the single place where
    // a run can be refused for QUOTA_EXCEEDED. Skipped when the task has
    // no agent_id (legacy / pre-LB1 dispatch) or no gate is wired.
    if (this.deps.agentQuotaGate && task.agent_id) {
      let quota: Awaited<ReturnType<AgentQuotaGate["peek"]>>;
      try {
        quota = await this.deps.agentQuotaGate.peek({ agentId: task.agent_id });
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        await this.markBlocked(task, {
          code: ORCHESTRATOR_ERROR_CODES.QUOTA_EXCEEDED,
          message: `quota_gate_threw:${message}`,
        });
        return this.outcome(task, "blocked", startedAt, {
          errorCode: ORCHESTRATOR_ERROR_CODES.QUOTA_EXCEEDED,
          errorMessage: `quota_gate_threw:${message}`,
        });
      }
      if (!quota.ok) {
        const message = `${quota.reason} (window=${quota.window})`;
        await this.markBlocked(task, {
          code: ORCHESTRATOR_ERROR_CODES.QUOTA_EXCEEDED,
          message,
        });
        return this.outcome(task, "blocked", startedAt, {
          errorCode: ORCHESTRATOR_ERROR_CODES.QUOTA_EXCEEDED,
          errorMessage: message,
        });
      }
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

      // ── Step 5a (L3): snapshot pre-execute state for rollback ─────────
      // We MUST capture before adapter.execute() so the auto-rollback path
      // has the prior state on failure. Snapshot failures are non-fatal
      // when strategy='auto' is paired with adapters that surface
      // previous_state in their output (legacy behaviour); they DO surface
      // an event so operators can see it.
      let previousState: unknown | null = null;
      const ctx = {
        task,
        lockKey,
        ownerId: this.deps.ownerId,
        attempt: task.attempt_count + 1,
        startedAt: this.now().toISOString(),
      };
      // L3 — Generic snapshot capture. Adapters may declare an explicit
      // `snapshotProvider`; if they don't, the orchestrator falls back to
      // a kind-agnostic structural snapshot so EVERY task has at least an
      // identity envelope on the row at rollback time. This satisfies the
      // contract requirement that snapshot capture works without per-
      // adapter wiring.
      if (adapter.rollback_strategy === "auto" || adapter.rollback_strategy === "manual") {
        try {
          if (adapter.snapshotProvider) {
            previousState = await adapter.snapshotProvider(ctx);
          } else {
            // Default snapshot capture (kind-agnostic). The orchestrator
            // ALWAYS records a structural identity envelope; if the worker
            // injected a `defaultSnapshotter` (production wiring resolves
            // `entity_type`='<schema>.<table>' + `entity_id` to a `SELECT *`
            // against the canonical domain-schema table), the resolved row
            // is folded into the envelope under `entity_row`. This gives
            // adapters without a custom `snapshotProvider` enough state
            // to drive a restorative rollback (`UPDATE ... SET ... = $1`)
            // without per-domain wiring.
            let entityRow: Record<string, unknown> | null = null;
            if (this.deps.defaultSnapshotter) {
              try {
                entityRow = await this.deps.defaultSnapshotter(task);
              } catch (e) {
                const detail = e instanceof Error ? e.message : String(e);
                this.currentSinkErrors.push(
                  `${ROLLBACK_ERROR_CODES.SNAPSHOT_THREW}:default:${detail}`,
                );
                console.warn("[orchestrator-v2] defaultSnapshotter threw:", detail);
              }
            }
            previousState = {
              kind: "default",
              captured_at: ctx.startedAt,
              domain: task.domain,
              task_type: task.type,
              entity_type: task.entity_type,
              entity_id: task.entity_id,
              payload: task.payload ?? null,
              entity_row: entityRow,
            } as Record<string, unknown>;
          }
          if (previousState !== null && previousState !== undefined) {
            // Persist alongside the running-state hop so rollback (auto or
            // manual) can read it back from the row at any later point.
            await this.deps.repository.transition(task.id, "running", "running", {
              previous_state: previousState as Record<string, unknown>,
            });
            // ^ no-op transition — persistence layer's transition() with
            // from===to is treated as a guarded patch by all repository
            // implementations (Supabase eq filter still matches; in-memory
            // helper short-circuits to a patch).
          }
        } catch (e) {
          const detail = e instanceof Error ? e.message : String(e);
          this.currentSinkErrors.push(
            `${ROLLBACK_ERROR_CODES.SNAPSHOT_THREW}:${detail}`,
          );
          console.warn("[orchestrator-v2] snapshot capture threw:", detail);
        }
      }

      let adapterResult: AdapterResult;
      try {
        adapterResult = await adapter.execute(ctx);
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
        // L3: auto-rollback fires AFTER the failed-state write so observers
        // see failed→rolling_back, never running→rolling_back.
        await this.maybeAutoRollback(task, adapter, previousState, null, message);
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
        await this.maybeAutoRollback(
          task,
          adapter,
          previousState,
          adapterResult.output ?? null,
          message,
        );
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
        // L3 (#811) — Verification service itself threw AFTER execute().
        // The mutation has already been applied, so we MUST attempt
        // auto-rollback per adapter contract to avoid leaving the domain
        // half-committed. Symmetrical to `decision.kind === "threw"`
        // below.
        await this.maybeAutoRollback(
          task,
          adapter,
          previousState,
          adapterPayload.output ?? null,
          message,
        );
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
        // L3: mutation already happened (verifier runs post-execute) — auto-
        // rollback per adapter contract so we never leave the domain in a
        // half-committed state.
        await this.maybeAutoRollback(
          task,
          adapter,
          previousState,
          adapterPayload.output ?? null,
          decision.error,
        );
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
        // L3: mutation already happened (verifier runs post-execute) —
        // compensate via auto-rollback per the adapter's declared
        // contract.
        await this.maybeAutoRollback(
          task,
          adapter,
          previousState,
          adapterPayload.output ?? null,
          mismatchMessage,
        );
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
      // ── LB1 follow-up (#834): sensitive-output hook on canonical lifecycle ─
      // When the adapter flagged its output as sensitive (PII / contract /
      // caller hint), the orchestrator transitions running→pending_review
      // and lets the canonical approvals inbox decide the run via
      // `decide_task_approval`. No parallel `held_for_review` flag — the
      // status itself plus `blocked_reason` carry the same information.
      const flagOutput = (adapterResult.output ?? {}) as Record<string, unknown>;
      const flagged = flagOutput.flaggedSensitive === true;
      const flagReason = typeof flagOutput.flaggedReason === "string"
        ? (flagOutput.flaggedReason as string)
        : flagged ? "sensitive" : null;
      const flagCost = typeof flagOutput.cost_usd === "number"
        ? (flagOutput.cost_usd as number)
        : null;
      const flagLatency = typeof flagOutput.latency_ms === "number"
        ? (flagOutput.latency_ms as number)
        : null;

      if (flagged) {
        const heldOk = await this.deps.repository.transition(
          task.id,
          "running",
          "pending_review",
          {
            execution_result: result,
            blocked_reason: flagReason ?? "sensitive",
            error_code: null,
            ...(flagCost !== null ? { cost_usd: flagCost } : {}),
            ...(flagLatency !== null ? { latency_ms: flagLatency } : {}),
          },
        );
        if (!heldOk) {
          outcome = this.outcome(task, "blocked", startedAt, {
            errorCode: ORCHESTRATOR_ERROR_CODES.PERSIST_FAILED,
            errorMessage: "Could not transition running→pending_review",
          });
          return outcome;
        }
        // The DB trigger emits `approval.requested` when the row enters
        // pending_review, so we do not double-emit here. We surface the
        // verification telemetry, then return finalStatus=blocked with a
        // REVIEW_HOLD code so the loop accounts this run as terminated
        // pending a human decision.
        await this.emit(task, CANONICAL_EXECUTION_EVENTS.TASK_VERIFIED, {
          ...(decision.details ? { details: decision.details } : {}),
        });
        outcome = this.outcome(task, "blocked", startedAt, {
          errorCode: "REVIEW_HOLD",
          errorMessage: flagReason ?? "sensitive",
          result,
        });
        return outcome;
      }

      const ok = await this.deps.repository.transition(task.id, "running", "succeeded", {
        execution_result: result,
        error_code: null,
        ...(flagCost !== null ? { cost_usd: flagCost } : {}),
        ...(flagLatency !== null ? { latency_ms: flagLatency } : {}),
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

  // ── L3 (#811) — Rollback path ────────────────────────────────────────────

  /**
   * runRollback — public manual-rollback entry point. Picks up a task that
   * is ALREADY in `rolling_back` (typically transitioned there by the
   * `system.request_rollback` RPC or by the execution-loop poller) and
   * walks it through `adapter.rollback` to a terminal `rolled_back`
   * (success) or non-terminal `rollback_failed` (must be human-resolved).
   *
   * Returns an OrchestrationOutcome whose `finalStatus` is one of
   * `succeeded` (legacy field name re-purposed) | `failed` | `blocked`,
   * mapped from the SQL terminal:
   *   rolled_back     → finalStatus="succeeded"
   *   rollback_failed → finalStatus="failed"
   *   blocked         → finalStatus="blocked"  (no adapter / illegal status)
   */
  async runRollback(taskId: string): Promise<OrchestrationOutcome> {
    const startedAt = Date.now();
    this.currentSinkErrors = [];

    const task = await this.deps.repository.loadTask(taskId);
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

    if (task.status !== "rolling_back" && task.status !== "rollback_failed") {
      return this.outcome(task, "blocked", startedAt, {
        errorCode: ORCHESTRATOR_ERROR_CODES.ILLEGAL_STATUS,
        errorMessage:
          `runRollback refuses task in status "${task.status}"; ` +
          `only "rolling_back" or "rollback_failed" are accepted`,
      });
    }

    // From `rollback_failed` we MUST first transition back to
    // `rolling_back` (the matrix mandates the hop) so the row carries a
    // fresh `rollback_started_at`.
    if (task.status === "rollback_failed") {
      const re = await this.deps.repository.transition(
        task.id,
        "rollback_failed",
        "rolling_back",
      );
      if (!re) {
        return this.outcome(task, "blocked", startedAt, {
          errorCode: ORCHESTRATOR_ERROR_CODES.PERSIST_FAILED,
          errorMessage: "Could not re-enter rolling_back from rollback_failed",
        });
      }
      task.status = "rolling_back";
    }

    const adapter = this.deps.registry.get(task.domain, task.type);
    if (!adapter || !adapter.rollback) {
      const code = ROLLBACK_ERROR_CODES.NO_ROLLBACK_HANDLER;
      const message = !adapter
        ? `No adapter registered for (${task.domain}, ${task.type})`
        : `Adapter ${adapter.domain}.${adapter.taskType} declares no rollback handler`;
      // Fail-loud: leave row in rollback_failed for human resolution.
      await this.deps.repository.transition(task.id, "rolling_back", "rollback_failed", {
        error_code: code,
        rollback_result: { error: message, success: false },
      });
      await this.emit(task, CANONICAL_EXECUTION_EVENTS.TASK_ROLLBACK_FAILED, {
        errorCode: code,
        errorMessage: message,
      });
      return this.outcome(task, "failed", startedAt, {
        errorCode: code,
        errorMessage: message,
      });
    }

    // ── L3 defense-in-depth: contract guard for succeeded-origin rollbacks.
    // The DB RPC `system.request_rollback` validates governance, but the
    // orchestrator MUST also refuse if the operator forced the row into
    // rolling_back via a direct UPDATE that bypassed the RPC. The source
    // of truth is `pre_rollback_status`, populated by the RPC and the
    // auto-rollback path. If it equals "succeeded", only adapters that
    // opt in via `allow_rollback_after_success` may proceed.
    if (
      task.pre_rollback_status === "succeeded" &&
      adapter.allow_rollback_after_success !== true
    ) {
      const code = ROLLBACK_ERROR_CODES.ROLLBACK_NOT_ALLOWED;
      const message =
        `Adapter ${adapter.domain}.${adapter.taskType} does not declare ` +
        `allow_rollback_after_success; refusing succeeded-origin rollback`;
      await this.deps.repository.transition(task.id, "rolling_back", "rollback_failed", {
        error_code: code,
        rollback_result: { error: message, success: false },
      });
      await this.emit(task, CANONICAL_EXECUTION_EVENTS.TASK_ROLLBACK_FAILED, {
        errorCode: code,
        errorMessage: message,
      });
      return this.outcome(task, "failed", startedAt, {
        errorCode: code,
        errorMessage: message,
      });
    }


    const lockKey = adapter.getLockKey ? adapter.getLockKey(task) : defaultLockKey(task);
    const acquired = await this.deps.locks.acquire(
      lockKey,
      this.deps.ownerId,
      this.lockTtlSeconds,
    );
    if (!acquired) {
      // Treat as transient — leave the row in rolling_back so the next
      // poller tick retries. We surface the fact via sinkErrors.
      const message = `Could not acquire lock "${lockKey}" for rollback within TTL`;
      this.currentSinkErrors.push(`ROLLBACK_LOCK_TIMEOUT:${lockKey}`);
      return this.outcome(task, "blocked", startedAt, {
        errorCode: ORCHESTRATOR_ERROR_CODES.LOCK_TIMEOUT,
        errorMessage: message,
      });
    }

    try {
      // Legacy fallback: pre-L3 adapters embedded their snapshot inside
      // `execution_result.output.previous_state` (marketplace pre-L3
      // behaviour) — that column is not on the canonical ExecutionTask
      // type but IS on the underlying row, so we cast through `unknown`.
      const legacyOutput =
        ((task as unknown as {
          execution_result?: { output?: Record<string, unknown> | null } | null;
        }).execution_result?.output ?? null) as Record<string, unknown> | null;
      const previousState =
        task.previous_state ??
        (legacyOutput?.previous_state ?? null);
      const reason = task.rollback_reason ?? "manual rollback request";
      const result = await this.performRollback(
        task,
        adapter,
        previousState as unknown,
        null,
        reason,
        "manual",
      );
      return this.outcome(task, result.success ? "succeeded" : "failed", startedAt, {
        errorCode: result.errorCode,
        errorMessage: result.errorMessage,
        result: result.result,
      });
    } finally {
      try {
        await this.deps.locks.release(lockKey, this.deps.ownerId);
      } catch (e) {
        const detail = e instanceof Error ? e.message : String(e);
        this.currentSinkErrors.push(`UNLOCK_FAILED:${lockKey}:${detail}`);
      }
      this.pingHeartbeat();
    }
  }

  /**
   * Auto-rollback hook called from the run() failure paths. The task row
   * has ALREADY been written to `failed` by the caller; this method
   * transitions failed→rolling_back→{rolled_back|rollback_failed}.
   *
   * Pre-conditions:
   *   - adapter.rollback_strategy === "auto"
   *   - adapter.rollback is registered (registry guarantees this)
   *   - we hold the lock for the duration of the call (run() guarantees
   *     this in its finally block)
   *
   * Failures here NEVER mask the original execution failure — the outer
   * outcome still reports `failed` with the original error_code; rollback
   * progress lives in `rollback_result` and the rollback canonical events.
   */
  private async maybeAutoRollback(
    task: ExecutionTask,
    adapter: DomainAdapter,
    previousState: unknown | null,
    output: unknown | null,
    failureReason: string,
  ): Promise<void> {
    if (adapter.rollback_strategy !== "auto") return;
    if (!adapter.rollback) {
      // Should be impossible (registry validates), but fail loudly.
      console.warn(
        `[orchestrator-v2] auto-rollback requested but no handler on ${adapter.domain}.${adapter.taskType}`,
      );
      return;
    }
    await this.performRollback(
      task,
      adapter,
      previousState,
      output,
      failureReason,
      "auto",
    );
  }

  /**
   * performRollback — common rollback driver shared by auto + manual paths.
   * Owns the entire rolling_back → terminal transition and event emission.
   * Returns a normalized verdict for the caller.
   */
  private async performRollback(
    task: ExecutionTask,
    adapter: DomainAdapter,
    previousState: unknown | null,
    output: unknown | null,
    failureReason: string,
    trigger: "auto" | "manual",
  ): Promise<{
    success: boolean;
    errorCode?: string;
    errorMessage?: string;
    result?: Record<string, unknown>;
  }> {
    const lockKey = adapter.getLockKey ? adapter.getLockKey(task) : defaultLockKey(task);

    // For auto-rollback the row is currently `failed`; for manual it is
    // already `rolling_back`. Normalize to `rolling_back` before invoking
    // the handler.
    if (trigger === "auto") {
      const claimed = await this.deps.repository.transition(
        task.id,
        "failed",
        "rolling_back",
        {
          rollback_reason: failureReason,
          // Origin marker for the contract guard in runRollback() and
          // any downstream observers — auto-rollback always originates
          // from `failed`.
          pre_rollback_status: "failed",
        },
      );
      if (!claimed) {
        // Someone else (operator?) already moved the row. Be permissive —
        // the manual path will pick up the work.
        return {
          success: false,
          errorCode: ROLLBACK_ERROR_CODES.ROLLBACK_NOT_ALLOWED,
          errorMessage:
            `Auto-rollback could not transition failed→rolling_back for ${task.id}`,
        };
      }
      task.status = "rolling_back";
    }

    await this.emit(task, CANONICAL_EXECUTION_EVENTS.TASK_ROLLBACK_STARTED, {
      trigger,
      lockKey,
      failureReason,
      hasSnapshot: previousState !== null && previousState !== undefined,
    });

    const invocation: RollbackInvocation = {
      previousState,
      output,
      failureReason,
      trigger,
    };

    let rb: RollbackResult;
    try {
      rb = await adapter.rollback!(
        {
          task,
          lockKey,
          ownerId: this.deps.ownerId,
          attempt: 1,
          startedAt: this.now().toISOString(),
        },
        invocation,
      );
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      await this.deps.repository.transition(task.id, "rolling_back", "rollback_failed", {
        error_code: ROLLBACK_ERROR_CODES.ROLLBACK_THREW,
        rollback_result: {
          success: false,
          error: message,
          trigger,
        },
      });
      await this.emit(task, CANONICAL_EXECUTION_EVENTS.TASK_ROLLBACK_FAILED, {
        errorCode: ROLLBACK_ERROR_CODES.ROLLBACK_THREW,
        errorMessage: message,
        trigger,
      });
      return {
        success: false,
        errorCode: ROLLBACK_ERROR_CODES.ROLLBACK_THREW,
        errorMessage: message,
      };
    }

    if (rb.success) {
      const ok = await this.deps.repository.transition(
        task.id,
        "rolling_back",
        "rolled_back",
        {
          rollback_result: {
            success: true,
            output: rb.output ?? null,
            logs: rb.logs ?? [],
            trigger,
          },
          error_code: null,
        },
      );
      if (!ok) {
        return {
          success: false,
          errorCode: ORCHESTRATOR_ERROR_CODES.PERSIST_FAILED,
          errorMessage: "Could not transition rolling_back→rolled_back",
        };
      }
      await this.emit(task, CANONICAL_EXECUTION_EVENTS.TASK_ROLLED_BACK, {
        trigger,
        output: rb.output ?? null,
      });
      return {
        success: true,
        result: { output: rb.output ?? null, logs: rb.logs ?? [], trigger },
      };
    }

    const code = rb.errorCode ?? ROLLBACK_ERROR_CODES.ROLLBACK_FAILED;
    const message = rb.errorMessage ?? "Rollback handler reported failure";
    await this.deps.repository.transition(task.id, "rolling_back", "rollback_failed", {
      error_code: code,
      rollback_result: {
        success: false,
        error: message,
        output: rb.output ?? null,
        logs: rb.logs ?? [],
        trigger,
      },
    });
    await this.emit(task, CANONICAL_EXECUTION_EVENTS.TASK_ROLLBACK_FAILED, {
      errorCode: code,
      errorMessage: message,
      trigger,
    });
    return { success: false, errorCode: code, errorMessage: message };
  }
}

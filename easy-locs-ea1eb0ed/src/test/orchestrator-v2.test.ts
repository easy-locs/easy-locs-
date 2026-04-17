/**
 * ExecutionOrchestratorV2 — unit + integration tests (task #752).
 *
 * Covers the strict pipeline contract:
 *   - happy path runs through all steps and emits the canonical event sequence
 *   - validation failure → blocked + no execute, no lock
 *   - adapter throws → failed, lock released
 *   - idempotency hit → succeeded without invoking the adapter
 *   - missing adapter → blocked with NO_ADAPTER
 *   - integration: stub adapter end-to-end against in-memory dependencies
 */
import { describe, it, expect, beforeEach } from "vitest";

import {
  ExecutionOrchestratorV2,
  type ValidationGate,
} from "../../supabase/functions/_shared/execution/orchestrator-v2.ts";
import {
  AdapterRegistry,
  setStrictAgentRegistration,
} from "../../supabase/functions/_shared/execution/adapter-registry.ts";

// These tests pre-date the L1 sovereign-agent registry; they exercise the
// orchestrator/registry contracts with bare stub adapters that have no
// agent ref. Opt out of strict mode for the duration of this suite.
setStrictAgentRegistration(false);
import {
  MemoryLockService,
} from "../../supabase/functions/_shared/execution/lock-service.ts";
import {
  MemoryIdempotencyService,
} from "../../supabase/functions/_shared/execution/idempotency-service.ts";
import {
  InMemoryEventSink,
  CANONICAL_EXECUTION_EVENTS,
} from "../../supabase/functions/_shared/execution/canonical-events.ts";
import {
  VerifierRegistry,
  type TaskVerifier,
} from "../../supabase/functions/_shared/execution/verifier-registry.ts";
import {
  TaskVerificationService,
} from "../../supabase/functions/_shared/execution/verification-service.ts";
import type {
  AdapterResult,
  DomainAdapter,
  ExecutionContext,
  ExecutionTask,
  ExecutionTaskStatus,
} from "../../supabase/functions/_shared/execution/types.ts";
import type { TaskRepository } from "../../supabase/functions/_shared/execution/persistence.ts";

function buildTask(overrides: Partial<ExecutionTask> = {}): ExecutionTask {
  return {
    id: "task-1",
    type: "TEST_ACTION",
    domain: "test",
    risk_level: "SAFE",
    status: "queued",
    payload: { foo: "bar" },
    approved_by: null,
    attempt_count: 0,
    max_attempts: 3,
    parent_task_id: null,
    requested_by: "system",
    idempotency_key: null,
    lock_key: null,
    entity_type: null,
    entity_id: null,
    correlation_id: null,
    root_task_id: null,
    requires_approval: false,
    approval_policy: "none",
    previous_state: null,
    rollback_result: null,
    rollback_reason: null,
    rollback_strategy: "none",
    pre_rollback_status: null,
    error_code: null,
    execution_result: null,
    ...overrides,
  };
}

class MemoryRepository implements TaskRepository {
  public readonly tasks = new Map<string, ExecutionTask>();
  public readonly transitions: Array<{
    id: string;
    from: ExecutionTaskStatus;
    to: ExecutionTaskStatus;
    patch?: Record<string, unknown>;
  }> = [];
  // Allowed transitions mirror the SQL state machine (subset relevant here).
  private readonly allowed: Record<ExecutionTaskStatus, ExecutionTaskStatus[]> = {
    draft: ["pending_review", "approved", "queued", "cancelled"],
    pending_review: ["approved", "rejected", "cancelled"],
    approved: ["queued", "cancelled"],
    rejected: ["draft", "cancelled"],
    queued: ["running", "blocked", "cancelled"],
    running: ["succeeded", "failed", "blocked", "running"],
    failed: ["queued", "blocked", "rolled_back", "rolling_back", "cancelled"],
    succeeded: ["rolled_back", "rolling_back"],
    blocked: ["queued", "cancelled"],
    rolling_back: ["rolled_back", "rollback_failed"],
    rolled_back: [],
    rollback_failed: ["rolling_back", "blocked", "cancelled"],
    cancelled: [],
  };

  seed(task: ExecutionTask) {
    this.tasks.set(task.id, { ...task });
  }

  async loadTask(taskId: string): Promise<ExecutionTask | null> {
    const t = this.tasks.get(taskId);
    return t ? { ...t } : null;
  }

  async transition(
    taskId: string,
    from: ExecutionTaskStatus,
    to: ExecutionTaskStatus,
    patch: Record<string, unknown> = {},
  ): Promise<boolean> {
    const t = this.tasks.get(taskId);
    if (!t) return false;
    if (t.status !== from) return false;
    if (from !== to && !this.allowed[from].includes(to)) return false;
    const updated = { ...t, ...patch, status: to } as ExecutionTask;
    this.tasks.set(taskId, updated);
    this.transitions.push({ id: taskId, from, to, patch });
    return true;
  }

}

const PASSING_VALIDATOR: ValidationGate = {
  validate: async () => ({ ok: true }),
};

const PASSING_VERIFIER = (domain: string, taskType: string): TaskVerifier => ({
  domain,
  taskType,
  verify: async () => ({ ok: true }),
});

function makeOrchestrator(opts: {
  registry?: AdapterRegistry;
  repo?: MemoryRepository;
  locks?: MemoryLockService;
  idem?: MemoryIdempotencyService;
  sink?: InMemoryEventSink;
  validator?: ValidationGate;
  verifiers?: VerifierRegistry;
  /** When true (default), auto-register a passing verifier matching the
   * first adapter so existing happy-path tests stay happy. */
  autoVerifier?: boolean;
}) {
  const registry = opts.registry ?? new AdapterRegistry();
  const repo = opts.repo ?? new MemoryRepository();
  const locks = opts.locks ?? new MemoryLockService();
  const idem = opts.idem ?? new MemoryIdempotencyService();
  const sink = opts.sink ?? new InMemoryEventSink();
  const verifiers = opts.verifiers ?? new VerifierRegistry();
  const verification = new TaskVerificationService(verifiers);
  const orch = new ExecutionOrchestratorV2({
    registry,
    repository: repo,
    locks,
    idempotency: idem,
    validator: opts.validator ?? PASSING_VALIDATOR,
    sink,
    verification,
    ownerId: "test-orch",
    lockTtlSeconds: 30,
  });
  return { orch, registry, repo, locks, idem, sink, verifiers };
}

describe("ExecutionOrchestratorV2", () => {
  it("runs a happy-path task through validate→lock→execute→succeeded and emits canonical events", async () => {
    const task = buildTask();
    const adapter: DomainAdapter = {
      domain: task.domain,
      taskType: task.type,
      execute: async (ctx: ExecutionContext): Promise<AdapterResult> => ({
        success: true,
        output: { echoed: ctx.task.payload.foo },
        actionsTaken: ["did_thing"],
      }),
    };
    const { orch, registry, repo, sink, locks, verifiers } = makeOrchestrator({});
    registry.register(adapter);
    verifiers.register(PASSING_VERIFIER(task.domain, task.type));
    repo.seed(task);

    const outcome = await orch.run(task.id);

    expect(outcome.finalStatus).toBe("succeeded");
    expect(outcome.errorCode).toBeUndefined();
    expect(repo.tasks.get(task.id)?.status).toBe("succeeded");
    expect(locks.has("test:TEST_ACTION")).toBe(false); // released
    expect(sink.names()).toEqual([
      CANONICAL_EXECUTION_EVENTS.TASK_QUEUED,
      CANONICAL_EXECUTION_EVENTS.TASK_LOCKED,
      CANONICAL_EXECUTION_EVENTS.TASK_STARTED,
      CANONICAL_EXECUTION_EVENTS.TASK_VERIFIED,
      CANONICAL_EXECUTION_EVENTS.TASK_SUCCEEDED,
      CANONICAL_EXECUTION_EVENTS.TASK_UNLOCKED,
    ]);
  });

  it("blocks the task when validation fails and never invokes the adapter", async () => {
    const task = buildTask();
    let executed = false;
    const adapter: DomainAdapter = {
      domain: task.domain,
      taskType: task.type,
      execute: async () => {
        executed = true;
        return { success: true };
      },
    };
    const { orch, registry, repo, sink, locks } = makeOrchestrator({
      validator: { validate: async () => ({ ok: false, reason: "bad", code: "VALIDATION_FAILED" }) },
    });
    registry.register(adapter);
    repo.seed(task);

    const outcome = await orch.run(task.id);

    expect(executed).toBe(false);
    expect(outcome.finalStatus).toBe("blocked");
    expect(outcome.errorCode).toBe("VALIDATION_FAILED");
    expect(repo.tasks.get(task.id)?.status).toBe("blocked");
    expect(locks.has("test:TEST_ACTION")).toBe(false);
    expect(sink.names()).toContain(CANONICAL_EXECUTION_EVENTS.TASK_BLOCKED);
    expect(sink.names()).not.toContain(CANONICAL_EXECUTION_EVENTS.TASK_LOCKED);
  });

  it("releases the lock and marks failed when the adapter throws", async () => {
    const task = buildTask();
    const adapter: DomainAdapter = {
      domain: task.domain,
      taskType: task.type,
      execute: async () => {
        throw new Error("boom");
      },
    };
    const { orch, registry, repo, sink, locks } = makeOrchestrator({});
    registry.register(adapter);
    repo.seed(task);

    const outcome = await orch.run(task.id);

    expect(outcome.finalStatus).toBe("failed");
    expect(outcome.errorCode).toBe("ADAPTER_THREW");
    expect(outcome.errorMessage).toBe("boom");
    expect(repo.tasks.get(task.id)?.status).toBe("failed");
    expect(locks.has("test:TEST_ACTION")).toBe(false);
    expect(sink.names()).toContain(CANONICAL_EXECUTION_EVENTS.TASK_FAILED);
    expect(sink.names()).toContain(CANONICAL_EXECUTION_EVENTS.TASK_UNLOCKED);
  });

  it("returns the cached idempotent result without invoking the adapter on a hit", async () => {
    const task = buildTask({ idempotency_key: "idem-1" });
    let invocations = 0;
    const adapter: DomainAdapter = {
      domain: task.domain,
      taskType: task.type,
      execute: async () => {
        invocations++;
        return { success: true };
      },
    };
    const idem = new MemoryIdempotencyService();
    idem.set("idem-1", { previously: "done" });
    const { orch, registry, repo, sink } = makeOrchestrator({ idem });
    registry.register(adapter);
    repo.seed(task);

    const outcome = await orch.run(task.id);

    expect(invocations).toBe(0);
    expect(outcome.finalStatus).toBe("succeeded");
    expect(outcome.idempotent).toBe(true);
    expect(outcome.result).toEqual({ previously: "done" });
    expect(sink.names()).toContain(CANONICAL_EXECUTION_EVENTS.TASK_IDEMPOTENT_HIT);
  });

  it("blocks the task with NO_ADAPTER when nothing is registered for (domain, task_type)", async () => {
    const task = buildTask({ type: "UNKNOWN" });
    const { orch, repo, sink, locks } = makeOrchestrator({});
    repo.seed(task);

    const outcome = await orch.run(task.id);

    expect(outcome.finalStatus).toBe("blocked");
    expect(outcome.errorCode).toBe("NO_ADAPTER");
    expect(repo.tasks.get(task.id)?.status).toBe("blocked");
    // No lock attempted because adapter lookup failed before lock step.
    expect(locks.has("test:UNKNOWN")).toBe(false);
    expect(sink.names()).toContain(CANONICAL_EXECUTION_EVENTS.TASK_BLOCKED);
    expect(sink.names()).not.toContain(CANONICAL_EXECUTION_EVENTS.TASK_LOCKED);
  });

  it("integration: dispatches a stub adapter and produces the full event sequence in order", async () => {
    const task = buildTask({
      id: "integ-1",
      type: "PUBLISH_LISTING",
      domain: "marketplace",
      entity_type: "listing",
      entity_id: "L-42",
      correlation_id: "corr-xyz",
    });
    const stubInvocations: ExecutionContext[] = [];
    const adapter: DomainAdapter = {
      domain: "marketplace",
      taskType: "PUBLISH_LISTING",
      execute: async (ctx) => {
        stubInvocations.push(ctx);
        return {
          success: true,
          output: { listingId: ctx.task.entity_id, published: true },
          actionsTaken: ["upsert_listing", "notify_subscribers"],
        };
      },
    };
    const { orch, registry, repo, sink, locks, verifiers } = makeOrchestrator({});
    registry.register(adapter);
    verifiers.register(PASSING_VERIFIER("marketplace", "PUBLISH_LISTING"));
    repo.seed(task);

    const outcome = await orch.run(task.id);

    expect(stubInvocations).toHaveLength(1);
    expect(stubInvocations[0].lockKey).toBe("marketplace:listing:L-42");
    expect(outcome.finalStatus).toBe("succeeded");
    expect(repo.tasks.get(task.id)?.status).toBe("succeeded");
    expect(locks.has("marketplace:listing:L-42")).toBe(false);
    // Verify event ordering covers the canonical sequence.
    const names = sink.names();
    expect(names[0]).toBe(CANONICAL_EXECUTION_EVENTS.TASK_QUEUED);
    expect(names).toContain(CANONICAL_EXECUTION_EVENTS.TASK_LOCKED);
    expect(names).toContain(CANONICAL_EXECUTION_EVENTS.TASK_STARTED);
    expect(names).toContain(CANONICAL_EXECUTION_EVENTS.TASK_VERIFIED);
    expect(names).toContain(CANONICAL_EXECUTION_EVENTS.TASK_SUCCEEDED);
    expect(names[names.length - 1]).toBe(CANONICAL_EXECUTION_EVENTS.TASK_UNLOCKED);
    // Every event carries the correlation id from the task.
    for (const e of sink.events) {
      expect(e.correlationId).toBe("corr-xyz");
    }
  });

  it("normalizes an approved task to queued before driving the pipeline", async () => {
    const task = buildTask({ status: "approved", approved_by: "admin-1" });
    const adapter: DomainAdapter = {
      domain: task.domain,
      taskType: task.type,
      execute: async () => ({ success: true, output: { ok: true } }),
    };
    const { orch, registry, repo, verifiers } = makeOrchestrator({});
    registry.register(adapter);
    verifiers.register(PASSING_VERIFIER(task.domain, task.type));
    repo.seed(task);

    const outcome = await orch.run(task.id);

    expect(outcome.finalStatus).toBe("succeeded");
    // The very first transition recorded must be approved→queued.
    expect(repo.transitions[0]).toMatchObject({ from: "approved", to: "queued" });
  });

  it("blocks the task with IDEMPOTENCY_LOOKUP_FAILED instead of executing on lookup error", async () => {
    const task = buildTask({ idempotency_key: "idem-err" });
    let executed = false;
    const adapter: DomainAdapter = {
      domain: task.domain,
      taskType: task.type,
      execute: async () => {
        executed = true;
        return { success: true };
      },
    };
    const failingIdem = {
      findExistingResult: async () => {
        throw new Error("postgres down");
      },
    };
    const { orch, registry, repo, sink, locks } = makeOrchestrator({ idem: failingIdem as MemoryIdempotencyService });
    registry.register(adapter);
    repo.seed(task);

    const outcome = await orch.run(task.id);

    expect(executed).toBe(false);
    expect(outcome.finalStatus).toBe("blocked");
    expect(outcome.errorCode).toBe("IDEMPOTENCY_LOOKUP_FAILED");
    expect(repo.tasks.get(task.id)?.status).toBe("blocked");
    expect(locks.has("test:TEST_ACTION")).toBe(false);
    expect(sink.names()).toContain(CANONICAL_EXECUTION_EVENTS.TASK_BLOCKED);
  });

  it("surfaces sink failures via outcome.sinkErrors instead of swallowing them", async () => {
    const task = buildTask();
    const adapter: DomainAdapter = {
      domain: task.domain,
      taskType: task.type,
      execute: async () => ({ success: true }),
    };
    const failingSink = {
      emit() {
        throw new Error("sink down");
      },
    };
    const { orch, registry, repo, verifiers } = makeOrchestrator({ sink: failingSink as unknown as InMemoryEventSink });
    registry.register(adapter);
    verifiers.register(PASSING_VERIFIER(task.domain, task.type));
    repo.seed(task);

    const outcome = await orch.run(task.id);

    expect(outcome.finalStatus).toBe("succeeded");
    expect((outcome.sinkErrors ?? []).length).toBeGreaterThan(0);
    expect(outcome.sinkErrors?.[0]).toContain("sink down");
  });
});

// ─── Sovereign Agent Control · L3 (#811) — Typed rollback path ──────────
describe("ExecutionOrchestratorV2 · rollback contract", () => {
  it("auto-rolls-back when the adapter throws (snapshot captured pre-execute)", async () => {
    const task = buildTask();
    const snapshots: Array<unknown> = [];
    const rollbacks: Array<{ prev: unknown; trigger: string }> = [];
    const adapter: DomainAdapter = {
      domain: task.domain,
      taskType: task.type,
      rollback_strategy: "auto",
      snapshotProvider: async () => {
        const snap = { foo: "before" };
        snapshots.push(snap);
        return snap;
      },
      execute: async () => {
        throw new Error("kaboom");
      },
      rollback: async (_ctx, inv) => {
        rollbacks.push({ prev: inv.previousState, trigger: inv.trigger });
        return { success: true, output: { restored: true } };
      },
    };
    const { orch, registry, repo, sink } = makeOrchestrator({});
    registry.register(adapter);
    repo.seed(task);

    const outcome = await orch.run(task.id);

    expect(outcome.finalStatus).toBe("failed");
    expect(snapshots).toHaveLength(1);
    expect(rollbacks).toHaveLength(1);
    expect(rollbacks[0].prev).toEqual({ foo: "before" });
    expect(rollbacks[0].trigger).toBe("auto");
    const final = repo.tasks.get(task.id);
    expect(final?.status).toBe("rolled_back");
    expect(final?.previous_state).toEqual({ foo: "before" });
    expect(sink.names()).toContain(CANONICAL_EXECUTION_EVENTS.TASK_ROLLBACK_STARTED);
    expect(sink.names()).toContain(CANONICAL_EXECUTION_EVENTS.TASK_ROLLED_BACK);
  });

  it("auto-rolls-back when the adapter returns success:false", async () => {
    const task = buildTask();
    let rollbackCalled = false;
    const adapter: DomainAdapter = {
      domain: task.domain,
      taskType: task.type,
      rollback_strategy: "auto",
      snapshotProvider: async () => ({ snap: 1 }),
      execute: async () => ({ success: false, errorMessage: "soft fail", errorCode: "X" }),
      rollback: async () => {
        rollbackCalled = true;
        return { success: true };
      },
    };
    const { orch, registry, repo } = makeOrchestrator({});
    registry.register(adapter);
    repo.seed(task);

    await orch.run(task.id);

    expect(rollbackCalled).toBe(true);
    expect(repo.tasks.get(task.id)?.status).toBe("rolled_back");
  });

  it("manual runRollback drives a rolling_back row to rolled_back", async () => {
    const task = buildTask({
      status: "rolling_back",
      previous_state: { snap: "manual" },
      rollback_reason: "operator-requested",
    });
    let seen: unknown = null;
    const adapter: DomainAdapter = {
      domain: task.domain,
      taskType: task.type,
      rollback_strategy: "manual",
      // Operator-triggered rollback of a previously-succeeded task
      // requires this opt-in flag (defense-in-depth check).
      allow_rollback_after_success: true,
      execute: async () => ({ success: true }),
      rollback: async (_ctx, inv) => {
        seen = inv.previousState;
        expect(inv.trigger).toBe("manual");
        return { success: true };
      },
    };
    const { orch, registry, repo, sink } = makeOrchestrator({});
    registry.register(adapter);
    repo.seed(task);

    const outcome = await orch.runRollback(task.id);

    expect(outcome.finalStatus).toBe("succeeded");
    expect(seen).toEqual({ snap: "manual" });
    expect(repo.tasks.get(task.id)?.status).toBe("rolled_back");
    expect(sink.names()).toContain(CANONICAL_EXECUTION_EVENTS.TASK_ROLLED_BACK);
  });

  it("marks rollback_failed (and stays there) when the rollback handler reports failure", async () => {
    const task = buildTask();
    const adapter: DomainAdapter = {
      domain: task.domain,
      taskType: task.type,
      rollback_strategy: "auto",
      snapshotProvider: async () => ({ snap: "x" }),
      execute: async () => {
        throw new Error("boom");
      },
      rollback: async () => ({
        success: false,
        errorCode: "RESTORE_FAILED",
        errorMessage: "downstream gone",
      }),
    };
    const { orch, registry, repo, sink } = makeOrchestrator({});
    registry.register(adapter);
    repo.seed(task);

    await orch.run(task.id);

    expect(repo.tasks.get(task.id)?.status).toBe("rollback_failed");
    expect(sink.names()).toContain(CANONICAL_EXECUTION_EVENTS.TASK_ROLLBACK_FAILED);
  });

  it("recovers a rollback_failed row via runRollback (re-enters rolling_back, then succeeds)", async () => {
    const task = buildTask({
      status: "rollback_failed",
      previous_state: { snap: "retry" },
      rollback_reason: "retrying-after-failure",
    });
    const adapter: DomainAdapter = {
      domain: task.domain,
      taskType: task.type,
      rollback_strategy: "manual",
      allow_rollback_after_success: true,
      execute: async () => ({ success: true }),
      rollback: async () => ({ success: true }),
    };
    const { orch, registry, repo } = makeOrchestrator({});
    registry.register(adapter);
    repo.seed(task);

    const outcome = await orch.runRollback(task.id);

    expect(outcome.finalStatus).toBe("succeeded");
    expect(repo.tasks.get(task.id)?.status).toBe("rolled_back");
  });

  it("refuses succeeded-origin rollback when adapter does not opt in via allow_rollback_after_success", async () => {
    // Operator forced a succeeded task into rolling_back via direct UPDATE
    // (bypassing the SQL RPC's policy check). The orchestrator must catch
    // this on the way in and refuse to invoke the handler. We mark
    // succeeded-origin by previous_state set + rollback_reason set + no
    // error_code on the row.
    const task = buildTask({
      status: "rolling_back",
      previous_state: { snap: "ok" },
      rollback_reason: "operator changed their mind",
      pre_rollback_status: "succeeded",
    });
    let handlerCalled = false;
    const adapter: DomainAdapter = {
      domain: task.domain,
      taskType: task.type,
      rollback_strategy: "manual",
      // NOTE: allow_rollback_after_success is intentionally NOT set
      execute: async () => ({ success: true }),
      rollback: async () => {
        handlerCalled = true;
        return { success: true };
      },
    };
    const { orch, registry, repo, sink } = makeOrchestrator({});
    registry.register(adapter);
    repo.seed(task);

    const outcome = await orch.runRollback(task.id);

    expect(handlerCalled).toBe(false);
    expect(outcome.finalStatus).toBe("failed");
    expect(repo.tasks.get(task.id)?.status).toBe("rollback_failed");
    expect(sink.names()).toContain(CANONICAL_EXECUTION_EVENTS.TASK_ROLLBACK_FAILED);
  });

  it("permits succeeded-origin rollback when adapter opts in via allow_rollback_after_success", async () => {
    const task = buildTask({
      status: "rolling_back",
      previous_state: { snap: "ok" },
      rollback_reason: "operator opt-in",
      pre_rollback_status: "succeeded",
    });
    let handlerCalled = false;
    const adapter: DomainAdapter = {
      domain: task.domain,
      taskType: task.type,
      rollback_strategy: "manual",
      allow_rollback_after_success: true,
      execute: async () => ({ success: true }),
      rollback: async () => {
        handlerCalled = true;
        return { success: true };
      },
    };
    const { orch, registry, repo } = makeOrchestrator({});
    registry.register(adapter);
    repo.seed(task);

    const outcome = await orch.runRollback(task.id);
    expect(handlerCalled).toBe(true);
    expect(outcome.finalStatus).toBe("succeeded");
    expect(repo.tasks.get(task.id)?.status).toBe("rolled_back");
  });

  it("blocks runRollback when the row is not in a rollback state", async () => {
    const task = buildTask({ status: "succeeded" });
    const adapter: DomainAdapter = {
      domain: task.domain,
      taskType: task.type,
      rollback_strategy: "manual",
      execute: async () => ({ success: true }),
      rollback: async () => ({ success: true }),
    };
    const { orch, registry, repo } = makeOrchestrator({});
    registry.register(adapter);
    repo.seed(task);

    const outcome = await orch.runRollback(task.id);
    expect(outcome.finalStatus).toBe("blocked");
    expect(outcome.errorCode).toBeDefined();
  });
});

describe("Verification layer (task #753)", () => {
  it("blocks with NO_VERIFIER when the adapter succeeded but no verifier is registered", async () => {
    const task = buildTask();
    let executed = false;
    const adapter: DomainAdapter = {
      domain: task.domain,
      taskType: task.type,
      execute: async () => {
        executed = true;
        return { success: true, output: { ok: true } };
      },
    };
    const { orch, registry, repo, sink, locks } = makeOrchestrator({});
    registry.register(adapter); // no verifier registered
    repo.seed(task);

    const outcome = await orch.run(task.id);

    expect(executed).toBe(true);
    expect(outcome.finalStatus).toBe("blocked");
    expect(outcome.errorCode).toBe("NO_VERIFIER");
    expect(repo.tasks.get(task.id)?.status).toBe("blocked");
    expect(locks.has("test:TEST_ACTION")).toBe(false); // lock released
    const names = sink.names();
    expect(names).toContain(CANONICAL_EXECUTION_EVENTS.TASK_BLOCKED);
    expect(names).not.toContain(CANONICAL_EXECUTION_EVENTS.TASK_SUCCEEDED);
    expect(names).not.toContain(CANONICAL_EXECUTION_EVENTS.TASK_VERIFIED);
    // Persisted verification payload documents the refusal.
    const result = repo.tasks.get(task.id)?.execution_result as Record<string, unknown> | null;
    const verification = result?.verification as Record<string, unknown> | undefined;
    expect(verification?.ok).toBe(false);
    expect(verification?.error_code).toBe("NO_VERIFIER");
  });

  it("fails a lying adapter: verifier mismatch blocks the success path and emits task.verification_failed", async () => {
    const task = buildTask({
      entity_type: "listing",
      entity_id: "L-99",
    });
    // Lying adapter: claims success but the source of truth will disagree.
    const lyingAdapter: DomainAdapter = {
      domain: task.domain,
      taskType: task.type,
      execute: async () => ({
        success: true,
        output: { listingId: "L-99", published: true },
        actionsTaken: ["fake_publish"],
      }),
    };
    const verifier: TaskVerifier = {
      domain: task.domain,
      taskType: task.type,
      verify: async () => ({
        ok: false,
        expected: { published: true },
        actual: { published: false },
        mismatchPath: "published",
        details: { source: "db.listings" },
      }),
    };
    const { orch, registry, repo, sink, locks, verifiers } = makeOrchestrator({});
    registry.register(lyingAdapter);
    verifiers.register(verifier);
    repo.seed(task);

    const outcome = await orch.run(task.id);

    expect(outcome.finalStatus).toBe("failed");
    expect(outcome.errorCode).toBe("VERIFICATION_MISMATCH");
    expect(repo.tasks.get(task.id)?.status).toBe("failed");
    expect(locks.has("test:TEST_ACTION")).toBe(false);
    const names = sink.names();
    expect(names).toContain(CANONICAL_EXECUTION_EVENTS.TASK_VERIFICATION_FAILED);
    expect(names).toContain(CANONICAL_EXECUTION_EVENTS.TASK_FAILED);
    expect(names).not.toContain(CANONICAL_EXECUTION_EVENTS.TASK_SUCCEEDED);
    expect(names).not.toContain(CANONICAL_EXECUTION_EVENTS.TASK_VERIFIED);
    // Ordering: verification_failed must come before failed.
    expect(names.indexOf(CANONICAL_EXECUTION_EVENTS.TASK_VERIFICATION_FAILED))
      .toBeLessThan(names.indexOf(CANONICAL_EXECUTION_EVENTS.TASK_FAILED));
    // task.verification_failed carries expected/actual/mismatch_path.
    const failedEvt = sink.events.find(
      (e) => e.name === CANONICAL_EXECUTION_EVENTS.TASK_VERIFICATION_FAILED,
    );
    expect(failedEvt?.payload).toMatchObject({
      errorCode: "VERIFICATION_MISMATCH",
      expected: { published: true },
      actual: { published: false },
      mismatch_path: "published",
    });
    // Persisted result captures the structured mismatch.
    const result = repo.tasks.get(task.id)?.execution_result as Record<string, unknown>;
    const verification = result.verification as Record<string, unknown>;
    expect(verification.ok).toBe(false);
    expect(verification.error_code).toBe("VERIFICATION_MISMATCH");
    expect(verification.mismatch_path).toBe("published");
  });

  it("fails with VERIFIER_THREW when the verifier itself raises", async () => {
    const task = buildTask();
    const adapter: DomainAdapter = {
      domain: task.domain,
      taskType: task.type,
      execute: async () => ({ success: true }),
    };
    const verifier: TaskVerifier = {
      domain: task.domain,
      taskType: task.type,
      verify: async () => {
        throw new Error("db unreachable");
      },
    };
    const { orch, registry, repo, sink, verifiers } = makeOrchestrator({});
    registry.register(adapter);
    verifiers.register(verifier);
    repo.seed(task);

    const outcome = await orch.run(task.id);

    expect(outcome.finalStatus).toBe("failed");
    expect(outcome.errorCode).toBe("VERIFIER_THREW");
    expect(outcome.errorMessage).toContain("db unreachable");
    const names = sink.names();
    expect(names).toContain(CANONICAL_EXECUTION_EVENTS.TASK_VERIFICATION_FAILED);
    expect(names).toContain(CANONICAL_EXECUTION_EVENTS.TASK_FAILED);
    expect(names).not.toContain(CANONICAL_EXECUTION_EVENTS.TASK_SUCCEEDED);
  });

  it("succeeds and emits task.verified (in order) when the verifier confirms the expected state", async () => {
    const task = buildTask();
    let verifyCalls = 0;
    const adapter: DomainAdapter = {
      domain: task.domain,
      taskType: task.type,
      execute: async () => ({ success: true, output: { ok: true } }),
    };
    const verifier: TaskVerifier = {
      domain: task.domain,
      taskType: task.type,
      verify: async () => {
        verifyCalls++;
        return { ok: true, details: { read_at: "2026-04-16T00:00:00.000Z" } };
      },
    };
    const { orch, registry, repo, sink, verifiers } = makeOrchestrator({});
    registry.register(adapter);
    verifiers.register(verifier);
    repo.seed(task);

    const outcome = await orch.run(task.id);

    expect(verifyCalls).toBe(1);
    expect(outcome.finalStatus).toBe("succeeded");
    const names = sink.names();
    expect(names.indexOf(CANONICAL_EXECUTION_EVENTS.TASK_VERIFIED))
      .toBeLessThan(names.indexOf(CANONICAL_EXECUTION_EVENTS.TASK_SUCCEEDED));
    // Persisted result merges the verification payload under the canonical key.
    const result = repo.tasks.get(task.id)?.execution_result as Record<string, unknown>;
    const verification = result.verification as Record<string, unknown>;
    expect(verification.ok).toBe(true);
    expect(verification.details).toMatchObject({ read_at: "2026-04-16T00:00:00.000Z" });
  });

  it("skips verification entirely when the adapter itself reports failure", async () => {
    const task = buildTask();
    let verifyCalls = 0;
    const adapter: DomainAdapter = {
      domain: task.domain,
      taskType: task.type,
      execute: async () => ({
        success: false,
        errorCode: "ADAPTER_FAILED",
        errorMessage: "honest failure",
      }),
    };
    const verifier: TaskVerifier = {
      domain: task.domain,
      taskType: task.type,
      verify: async () => {
        verifyCalls++;
        return { ok: true };
      },
    };
    const { orch, registry, repo, sink, verifiers } = makeOrchestrator({});
    registry.register(adapter);
    verifiers.register(verifier);
    repo.seed(task);

    const outcome = await orch.run(task.id);

    expect(verifyCalls).toBe(0);
    expect(outcome.finalStatus).toBe("failed");
    expect(outcome.errorCode).toBe("ADAPTER_FAILED");
    const names = sink.names();
    expect(names).not.toContain(CANONICAL_EXECUTION_EVENTS.TASK_VERIFIED);
    expect(names).not.toContain(CANONICAL_EXECUTION_EVENTS.TASK_VERIFICATION_FAILED);
  });
});

describe("VerifierRegistry", () => {
  it("rejects duplicate registration unless overwrite=true", () => {
    const reg = new VerifierRegistry();
    const v: TaskVerifier = {
      domain: "x",
      taskType: "Y",
      verify: async () => ({ ok: true }),
    };
    reg.register(v);
    expect(() => reg.register(v)).toThrow(/already registered/);
    expect(() => reg.register(v, { overwrite: true })).not.toThrow();
  });

  it("looks up case-insensitively on domain and task type", () => {
    const reg = new VerifierRegistry();
    reg.register({
      domain: "Marketplace",
      taskType: "publish_listing",
      verify: async () => ({ ok: true }),
    });
    expect(reg.get("marketplace", "PUBLISH_LISTING")).not.toBeNull();
    expect(reg.has("MARKETPLACE", "publish_listing")).toBe(true);
  });
});

describe("AdapterRegistry", () => {
  let registry: AdapterRegistry;
  beforeEach(() => {
    registry = new AdapterRegistry();
  });

  it("rejects duplicate registration unless overwrite=true", () => {
    const a: DomainAdapter = {
      domain: "x",
      taskType: "Y",
      execute: async () => ({ success: true }),
    };
    registry.register(a);
    expect(() => registry.register(a)).toThrow(/already registered/);
    expect(() => registry.register(a, { overwrite: true })).not.toThrow();
  });

  it("looks up by case-insensitive domain and case-insensitive task type", () => {
    registry.register({
      domain: "Marketplace",
      taskType: "publish_listing",
      execute: async () => ({ success: true }),
    });
    expect(registry.get("marketplace", "PUBLISH_LISTING")).not.toBeNull();
    expect(registry.has("MARKETPLACE", "publish_listing")).toBe(true);
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import { platformBus } from "@/lib/platform-bus";
import {
  TaskVerificationService,
  TASK_VERIFICATION_FAILED_EVENT,
  VERIFICATION_ERROR_CODES,
  type VerificationPersistPatch,
  type VerificationPersister,
} from "../verification-service";
import { VerifierRegistry, type TaskVerifier } from "../verifier";
import type { ExecutionTaskRow } from "../types";

// ── Fixtures ──────────────────────────────────────────────────────────────
function makeTask(overrides: Partial<ExecutionTaskRow> = {}): ExecutionTaskRow {
  return {
    id: "task-1",
    type: "marketplace.listing.publish",
    domain: "marketplace",
    risk_level: "MEDIUM",
    status: "running",
    payload: {},
    requested_by: "tester",
    parent_task_id: null,
    attempt_count: 1,
    max_attempts: 3,
    blocked_reason: null,
    approved_by: "admin-uid",
    approved_at: new Date().toISOString(),
    idempotency_key: "idem:marketplace:listing:x:abc",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    root_task_id: null,
    correlation_id: "corr-123",
    entity_type: "listing",
    entity_id: "listing-42",
    approval_policy: "single_admin",
    requires_approval: true,
    execution_state: null,
    rejected_by: null,
    escalated_by: null,
    locked_by: null,
    lock_key: null,
    validation_result: null,
    execution_result: null,
    rollback_result: null,
    retry_policy: null,
    error_code: null,
    started_at: new Date().toISOString(),
    completed_at: null,
    failed_at: null,
    rolled_back_at: null,
    next_retry_at: null,
    ...overrides,
  };
}

interface RecordedPatch {
  taskId: string;
  patch: VerificationPersistPatch;
}

function inMemoryPersister(): VerificationPersister & { records: RecordedPatch[] } {
  const records: RecordedPatch[] = [];
  return {
    records,
    async apply(taskId, patch) {
      records.push({ taskId, patch });
    },
  };
}

function makeVerifier(
  impl: TaskVerifier["verify"],
  overrides: Partial<Pick<TaskVerifier, "domain" | "taskType">> = {},
): TaskVerifier {
  return {
    domain: overrides.domain ?? "marketplace",
    taskType: overrides.taskType ?? "marketplace.listing.publish",
    verify: impl,
  };
}

describe("VerifierRegistry", () => {
  it("registers and looks up verifiers by (domain, task_type)", () => {
    const registry = new VerifierRegistry();
    const verifier = makeVerifier(async () => ({ ok: true }));
    registry.register(verifier);

    expect(registry.has("marketplace", "marketplace.listing.publish")).toBe(true);
    expect(registry.get("marketplace", "marketplace.listing.publish")).toBe(verifier);
    expect(registry.get("marketplace", "other")).toBeNull();
  });

  it("refuses duplicate registration for the same pair", () => {
    const registry = new VerifierRegistry();
    registry.register(makeVerifier(async () => ({ ok: true })));
    expect(() =>
      registry.register(makeVerifier(async () => ({ ok: true }))),
    ).toThrow(/already registered/);
  });

  it("rejects verifiers missing domain or taskType", () => {
    const registry = new VerifierRegistry();
    expect(() =>
      registry.register({
        domain: "",
        taskType: "x",
        verify: async () => ({ ok: true }),
      }),
    ).toThrow();
  });

  it("keys are case-insensitive on domain and trim whitespace", () => {
    const registry = new VerifierRegistry();
    registry.register(
      makeVerifier(async () => ({ ok: true }), {
        domain: "Marketplace",
        taskType: "marketplace.listing.publish",
      }),
    );
    expect(registry.has("MARKETPLACE", "marketplace.listing.publish")).toBe(true);
  });
});

describe("TaskVerificationService.run", () => {
  beforeEach(() => {
    platformBus.clearHistory();
  });

  it("marks the task blocked with NO_VERIFIER when no verifier is registered", async () => {
    const registry = new VerifierRegistry();
    const persister = inMemoryPersister();
    const service = new TaskVerificationService(registry, persister);
    const task = makeTask();

    const outcome = await service.run(task, { created_id: "x" });

    expect(outcome.status).toBe("blocked");
    expect(outcome.status === "blocked" && outcome.errorCode).toBe("NO_VERIFIER");
    expect(persister.records).toHaveLength(1);
    const patch = persister.records[0].patch;
    expect(patch.status).toBe("blocked");
    expect(patch.error_code).toBe(VERIFICATION_ERROR_CODES.NO_VERIFIER);
    expect(patch.blocked_reason).toMatch(/no verifier registered/);
    const verification = (patch.execution_result as Record<string, unknown>).verification as Record<string, unknown>;
    expect(verification.ok).toBe(false);
    expect(verification.error_code).toBe("NO_VERIFIER");
  });

  it("marks the task succeeded and persists a verification payload when the verifier passes", async () => {
    const registry = new VerifierRegistry();
    const persister = inMemoryPersister();
    registry.register(
      makeVerifier(async () => ({ ok: true, details: { observed_status: "active" } })),
    );
    const service = new TaskVerificationService(registry, persister);
    const task = makeTask();

    const outcome = await service.run(task, { listing_id: "listing-42" });

    expect(outcome.status).toBe("succeeded");
    const patch = persister.records[0].patch;
    expect(patch.status).toBe("succeeded");
    expect(patch.error_code).toBeNull();
    expect(patch.error).toBeNull();
    const verification = (patch.execution_result as Record<string, unknown>).verification as Record<string, unknown>;
    expect(verification.ok).toBe(true);
    expect((verification.details as Record<string, unknown>).observed_status).toBe("active");
    // Execution result is preserved on top of the verification block.
    expect((patch.execution_result as Record<string, unknown>).listing_id).toBe("listing-42");
  });

  it("marks the task failed with VERIFICATION_MISMATCH and emits task.verification_failed", async () => {
    const registry = new VerifierRegistry();
    const persister = inMemoryPersister();
    registry.register(
      makeVerifier(async () => ({
        ok: false,
        expected: "active",
        actual: "draft",
        mismatchPath: "status",
        details: { listing_id: "listing-42" },
      })),
    );
    const service = new TaskVerificationService(registry, persister);
    const task = makeTask();

    const received: unknown[] = [];
    const off = platformBus.on(TASK_VERIFICATION_FAILED_EVENT, (evt) => {
      received.push(evt);
    });
    try {
      const outcome = await service.run(task, { listing_id: "listing-42" });

      expect(outcome.status).toBe("failed");
      expect(
        outcome.status === "failed" && outcome.errorCode,
      ).toBe("VERIFICATION_MISMATCH");

      const patch = persister.records[0].patch;
      expect(patch.status).toBe("failed");
      expect(patch.error_code).toBe(VERIFICATION_ERROR_CODES.VERIFICATION_MISMATCH);
      expect(patch.error).toMatch(/VERIFICATION_MISMATCH/);
      const verification = (patch.execution_result as Record<string, unknown>).verification as Record<string, unknown>;
      expect(verification.ok).toBe(false);
      expect(verification.expected).toBe("active");
      expect(verification.actual).toBe("draft");
      expect(verification.mismatch_path).toBe("status");

      expect(received).toHaveLength(1);
      const evt = received[0] as {
        name: string;
        domain: string;
        payload: Record<string, unknown>;
      };
      expect(evt.name).toBe(TASK_VERIFICATION_FAILED_EVENT);
      expect(evt.domain).toBe("system");
      expect(evt.payload.task_id).toBe(task.id);
      expect(evt.payload.mismatch_path).toBe("status");
      expect(evt.payload.expected).toBe("active");
      expect(evt.payload.actual).toBe("draft");
    } finally {
      off();
    }
  });

  it("marks the task failed with VERIFIER_THREW if the verifier raises", async () => {
    const registry = new VerifierRegistry();
    const persister = inMemoryPersister();
    registry.register(
      makeVerifier(async () => {
        throw new Error("db read failed");
      }),
    );
    const service = new TaskVerificationService(registry, persister);
    const task = makeTask();

    const outcome = await service.run(task, {});

    expect(outcome.status).toBe("failed");
    expect(outcome.status === "failed" && outcome.errorCode).toBe("VERIFIER_THREW");
    const patch = persister.records[0].patch;
    expect(patch.status).toBe("failed");
    expect(patch.error_code).toBe(VERIFICATION_ERROR_CODES.VERIFIER_THREW);
    expect(patch.error).toMatch(/db read failed/);
  });

  it("respects the windowMs delay (clamped to the 2s ceiling)", async () => {
    vi.useFakeTimers();
    try {
      const registry = new VerifierRegistry();
      registry.register(makeVerifier(async () => ({ ok: true })));
      const persister = inMemoryPersister();
      const service = new TaskVerificationService(registry, persister);
      const task = makeTask();

      // Request 10s → must be clamped to 2s.
      const promise = service.run(task, {}, { windowMs: 10_000 });

      // Not yet settled before 2s elapses.
      await vi.advanceTimersByTimeAsync(1_500);
      expect(persister.records).toHaveLength(0);

      await vi.advanceTimersByTimeAsync(600);
      const outcome = await promise;
      expect(outcome.status).toBe("succeeded");
    } finally {
      vi.useRealTimers();
    }
  });

  it("integration-style: a lying adapter is caught by a real-state verifier → task fails", async () => {
    // Simulates: adapter returned success without mutating. The verifier reads
    // the real state and sees a mismatch. The task MUST end in failed state.
    const externalStore = new Map<string, { status: string }>();
    externalStore.set("listing-42", { status: "draft" }); // mutation didn't happen

    const registry = new VerifierRegistry();
    registry.register(
      makeVerifier(async (task) => {
        const listingId = (task.payload as { listing_id?: string }).listing_id;
        const row = listingId ? externalStore.get(listingId) : undefined;
        if (!row) {
          return {
            ok: false,
            expected: "active",
            actual: null,
            mismatchPath: "status",
          };
        }
        if (row.status !== "active") {
          return {
            ok: false,
            expected: "active",
            actual: row.status,
            mismatchPath: "status",
          };
        }
        return { ok: true };
      }),
    );
    const persister = inMemoryPersister();
    const service = new TaskVerificationService(registry, persister);
    const task = makeTask({ payload: { listing_id: "listing-42" } });

    // Adapter lied — it claims success but didn't mutate the external store.
    const adapterOutput = { ok: true, listing_id: "listing-42" };
    const outcome = await service.run(task, adapterOutput);

    expect(outcome.status).toBe("failed");
    expect(outcome.status === "failed" && outcome.errorCode).toBe(
      "VERIFICATION_MISMATCH",
    );
    const patch = persister.records[0].patch;
    expect(patch.status).toBe("failed");
    expect(patch.error_code).toBe(VERIFICATION_ERROR_CODES.VERIFICATION_MISMATCH);
  });
});

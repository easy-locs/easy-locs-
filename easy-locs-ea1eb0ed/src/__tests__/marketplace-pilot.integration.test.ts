/**
 * Integration tests for the Phase-2 marketplace pilot (task #754).
 *
 * Drives ExecutionOrchestratorV2 with the in-memory infra so we can exercise
 * the full pipeline (validate → authorize → lock → idempotency → execute →
 * verify → events → persist) without standing up Supabase.
 */
import { describe, expect, it, beforeEach } from "vitest";
import { ExecutionOrchestratorV2 } from "../../supabase/functions/_shared/execution/orchestrator-v2.ts";
import { AdapterRegistry } from "../../supabase/functions/_shared/execution/adapter-registry.ts";
import { VerifierRegistry } from "../../supabase/functions/_shared/execution/verifier-registry.ts";
import { TaskVerificationService } from "../../supabase/functions/_shared/execution/verification-service.ts";
import { MemoryLockService } from "../../supabase/functions/_shared/execution/lock-service.ts";
import { MemoryIdempotencyService } from "../../supabase/functions/_shared/execution/idempotency-service.ts";
import { InMemoryEventSink } from "../../supabase/functions/_shared/execution/canonical-events.ts";
import {
  createMarketplacePublishAdapter,
  createMarketplaceUnpublishAdapter,
  type DomainEvent,
} from "../../supabase/functions/_shared/execution/adapters/marketplace/marketplace-adapter.ts";
import {
  createMarketplaceListingVerifier,
} from "../../supabase/functions/_shared/execution/adapters/marketplace/listing-verifier.ts";
import {
  MARKETPLACE_DOMAIN,
  MARKETPLACE_TASK_TYPES,
} from "../../supabase/functions/_shared/execution/adapters/marketplace/types.ts";
import {
  MemoryListingRepository,
  MemoryTaskRepository,
  makeTask,
} from "../../supabase/functions/_shared/execution/__test-helpers__.ts";

function makeStack(opts?: { kycReason?: string | null }) {
  const repo = new MemoryListingRepository();
  const tasks = new MemoryTaskRepository();
  const adapters = new AdapterRegistry();
  const verifiers = new VerifierRegistry();
  const events: DomainEvent[] = [];
  const sink = new InMemoryEventSink();
  const locks = new MemoryLockService();
  const idem = new MemoryIdempotencyService();

  verifiers.register(createMarketplaceListingVerifier(repo, MARKETPLACE_TASK_TYPES.PUBLISH));
  verifiers.register(createMarketplaceListingVerifier(repo, MARKETPLACE_TASK_TYPES.UNPUBLISH));

  const deps = {
    repo,
    kyc: { ensureCanPublish: async () => opts?.kycReason ?? null },
    events: { async emit(e: DomainEvent) { events.push(e); } },
    verifiers,
  };
  adapters.register(createMarketplacePublishAdapter(deps));
  adapters.register(createMarketplaceUnpublishAdapter(deps));

  const orchestrator = new ExecutionOrchestratorV2({
    registry: adapters,
    repository: tasks,
    locks,
    idempotency: idem,
    validator: { async validate() { return { ok: true }; } },
    sink,
    ownerId: "test-runner",
    lockTtlSeconds: 30,
    verification: new TaskVerificationService(verifiers),
  });

  return { repo, tasks, adapters, verifiers, events, sink, locks, idem, orchestrator };
}

describe("Marketplace pilot — integration via ExecutionOrchestratorV2", () => {
  let stack: ReturnType<typeof makeStack>;

  beforeEach(() => {
    stack = makeStack();
    stack.repo.seed({ id: "L-100", status: "draft", is_published: false, visibility_mode: null });
    stack.repo.seed({ id: "L-200", status: "active", is_published: true, visibility_mode: "live" });
  });

  it("approve → queue → execute → verify → succeed for publish", async () => {
    const task = makeTask({
      id: "task-pub-1",
      type: MARKETPLACE_TASK_TYPES.PUBLISH,
      domain: MARKETPLACE_DOMAIN,
      status: "approved",
      approved_by: "admin-1",
      requires_approval: true,
      payload: { listingId: "L-100", ownerId: "owner-1" },
      entity_id: "L-100",
      idempotency_key: "idem-pub-1",
    });
    stack.tasks.upsert(task);

    const outcome = await stack.orchestrator.run(task.id);
    expect(outcome.finalStatus).toBe("succeeded");
    expect(stack.repo.raw("L-100")?.status).toBe("active");
    expect(stack.events).toHaveLength(1);
    expect(stack.events[0].name).toBe("domain.marketplace.listing_published");
    expect(stack.sink.names()).toContain("task.queued");
    expect(stack.sink.names()).toContain("task.locked");
    expect(stack.sink.names()).toContain("task.started");
    expect(stack.sink.names()).toContain("task.succeeded");
    expect(stack.sink.names()).toContain("task.unlocked");
  });

  it("unpublish executes without approval (SAFE_BY_POLICY)", async () => {
    const task = makeTask({
      id: "task-unpub-1",
      type: MARKETPLACE_TASK_TYPES.UNPUBLISH,
      status: "queued",
      approved_by: null,
      requires_approval: false,
      payload: { listingId: "L-200" },
      entity_id: "L-200",
      idempotency_key: "idem-unpub-1",
    });
    stack.tasks.upsert(task);

    const outcome = await stack.orchestrator.run(task.id);
    expect(outcome.finalStatus).toBe("succeeded");
    expect(stack.repo.raw("L-200")?.status).toBe("paused");
    expect(stack.events[0].name).toBe("domain.marketplace.listing_unpublished");
  });

  it("a second dispatch with the same idempotency key does NOT re-mutate the listing", async () => {
    const task = makeTask({
      id: "task-pub-2",
      type: MARKETPLACE_TASK_TYPES.PUBLISH,
      status: "queued",
      approved_by: "admin-1",
      payload: { listingId: "L-100", ownerId: "owner-1" },
      entity_id: "L-100",
      idempotency_key: "idem-double",
    });
    stack.tasks.upsert(task);

    const first = await stack.orchestrator.run(task.id);
    expect(first.finalStatus).toBe("succeeded");
    const mutationsAfterFirst = stack.repo.mutations;
    expect(mutationsAfterFirst).toBe(1);

    // Seed the idempotency cache as the orchestrator would for a real run.
    stack.idem.set("idem-double", { output: first.result?.output ?? {} });

    // Second task: fresh row but identical idempotency key → cache hit → no mutation.
    const replay = makeTask({
      id: "task-pub-2-replay",
      type: MARKETPLACE_TASK_TYPES.PUBLISH,
      status: "queued",
      approved_by: "admin-1",
      payload: { listingId: "L-100", ownerId: "owner-1" },
      entity_id: "L-100",
      idempotency_key: "idem-double",
    });
    stack.tasks.upsert(replay);
    const second = await stack.orchestrator.run(replay.id);
    expect(second.finalStatus).toBe("succeeded");
    expect(second.idempotent).toBe(true);
    expect(stack.repo.mutations).toBe(mutationsAfterFirst); // no extra mutation
    expect(stack.sink.names()).toContain("task.idempotent_hit");
  });

  it("lock collision serialises two concurrent dispatches on the same listing", async () => {
    const t1 = makeTask({
      id: "task-pub-A",
      type: MARKETPLACE_TASK_TYPES.PUBLISH,
      status: "queued",
      approved_by: "admin-1",
      payload: { listingId: "L-100", ownerId: "owner-1" },
      entity_id: "L-100",
      idempotency_key: "idem-A",
    });
    const t2 = makeTask({
      id: "task-pub-B",
      type: MARKETPLACE_TASK_TYPES.PUBLISH,
      status: "queued",
      approved_by: "admin-1",
      payload: { listingId: "L-100", ownerId: "owner-1" },
      entity_id: "L-100",
      idempotency_key: "idem-B",
    });
    stack.tasks.upsert(t1);
    stack.tasks.upsert(t2);

    // Pre-acquire the lock with a different owner so t1's run sees contention.
    await stack.locks.acquire("marketplace:listing:L-100", "concurrent-runner", 30);
    const blocked = await stack.orchestrator.run(t1.id);
    expect(blocked.finalStatus).toBe("failed");
    expect(blocked.errorCode).toBe("LOCK_TIMEOUT");

    // Release contention; t2 now succeeds. The mutation count proves we did
    // not double-execute t1.
    await stack.locks.release("marketplace:listing:L-100", "concurrent-runner");
    const ok = await stack.orchestrator.run(t2.id);
    expect(ok.finalStatus).toBe("succeeded");
    expect(stack.repo.mutations).toBe(1);
  });

  it("verifier mismatch terminates the task in failed with structured diff", async () => {
    // Cause divergence by patching setStatus to leave the listing untouched.
    stack.repo.setStatus = async (id) => stack.repo.raw(id);
    const task = makeTask({
      id: "task-pub-mismatch",
      type: MARKETPLACE_TASK_TYPES.PUBLISH,
      status: "queued",
      approved_by: "admin-1",
      payload: { listingId: "L-100", ownerId: "owner-1" },
      entity_id: "L-100",
      idempotency_key: "idem-mismatch",
    });
    stack.tasks.upsert(task);

    const outcome = await stack.orchestrator.run(task.id);
    expect(outcome.finalStatus).toBe("failed");
    expect(outcome.errorCode).toBe("VERIFICATION_MISMATCH");
    expect(stack.tasks.snapshot(task.id)?.status).toBe("failed");
  });
});

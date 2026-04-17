/**
 * Marketplace adapter — typed rollback integration test (#811).
 *
 * End-to-end:
 *   1. seed an inactive listing
 *   2. queue a PUBLISH task
 *   3. inject a verification mismatch so the adapter returns success:false
 *   4. assert the orchestrator auto-rolled back the listing to its
 *      pre-mutation snapshot AND emitted the canonical rollback events
 */
import { describe, it, expect } from "vitest";

import { ExecutionOrchestratorV2 } from "../../supabase/functions/_shared/execution/orchestrator-v2.ts";
import {
  AdapterRegistry,
  setStrictAgentRegistration,
} from "../../supabase/functions/_shared/execution/adapter-registry.ts";
import { MemoryLockService } from "../../supabase/functions/_shared/execution/lock-service.ts";
import { MemoryIdempotencyService } from "../../supabase/functions/_shared/execution/idempotency-service.ts";
import {
  InMemoryEventSink,
  CANONICAL_EXECUTION_EVENTS,
} from "../../supabase/functions/_shared/execution/canonical-events.ts";
import {
  VerifierRegistry,
} from "../../supabase/functions/_shared/execution/verifier-registry.ts";
import { TaskVerificationService } from "../../supabase/functions/_shared/execution/verification-service.ts";

import {
  MemoryTaskRepository,
  MemoryListingRepository,
  makeTask,
} from "../../supabase/functions/_shared/execution/__test-helpers__.ts";

import { createMarketplacePublishAdapter } from "../../supabase/functions/_shared/execution/adapters/marketplace/marketplace-adapter.ts";
import {
  MARKETPLACE_DOMAIN,
  MARKETPLACE_TASK_TYPES,
} from "../../supabase/functions/_shared/execution/adapters/marketplace/types.ts";
import { allowAllKyc } from "../../supabase/functions/_shared/execution/adapters/marketplace/kyc-gate.ts";

setStrictAgentRegistration(true);

describe("Marketplace adapter · L3 typed rollback", () => {
  it("auto-rolls back the listing when verification mismatches after mutation", async () => {
    const repo = new MemoryListingRepository();
    repo.seed({
      id: "listing-1",
      status: "paused",
      is_published: false,
      visibility_mode: "private",
    });

    const events: Array<{ name: string }> = [];
    const adapter = createMarketplacePublishAdapter({
      repo,
      kyc: allowAllKyc,
      events: { emit: async (e) => { events.push({ name: e.name }); } },
      // Force the verifier to disagree: we pretend the row never reached
      // `active`, which makes the adapter return success:false (verification
      // mismatch) AFTER it has already mutated the row.
      verify: async () => ({
        ok: false,
        message: "verifier forced mismatch",
        observed: { status: "active", is_published: true },
        expected: { status: "active", is_published: true },
      }),
    });

    const taskRepo = new MemoryTaskRepository();
    const task = makeTask({
      id: "rb-task-1",
      type: MARKETPLACE_TASK_TYPES.PUBLISH,
      domain: MARKETPLACE_DOMAIN,
      status: "queued",
      payload: { listingId: "listing-1", ownerId: "owner-1" },
      approved_by: "admin-1",
    });
    taskRepo.upsert(task);

    const sink = new InMemoryEventSink();
    const registry = new AdapterRegistry();
    registry.register(adapter);
    const verifiers = new VerifierRegistry();

    const orch = new ExecutionOrchestratorV2({
      registry,
      repository: taskRepo,
      locks: new MemoryLockService(),
      idempotency: new MemoryIdempotencyService(),
      validator: { validate: async () => ({ ok: true }) },
      sink,
      verification: new TaskVerificationService(verifiers),
      ownerId: "test-orch",
      lockTtlSeconds: 30,
    });

    const outcome = await orch.run(task.id);

    // Original execution failed (verification mismatch).
    expect(outcome.finalStatus).toBe("failed");

    // Listing was restored to its pre-publish snapshot.
    const final = repo.raw("listing-1");
    expect(final?.status).toBe("paused");
    expect(final?.is_published).toBe(false);
    expect(final?.visibility_mode).toBe("private");

    // Canonical rollback lifecycle was emitted.
    const names = sink.names();
    expect(names).toContain(CANONICAL_EXECUTION_EVENTS.TASK_ROLLBACK_STARTED);
    expect(names).toContain(CANONICAL_EXECUTION_EVENTS.TASK_ROLLED_BACK);

    // Task row reached the rolled_back terminal.
    const taskAfter = taskRepo.snapshot(task.id);
    expect(taskAfter?.status).toBe("rolled_back");
  });
});

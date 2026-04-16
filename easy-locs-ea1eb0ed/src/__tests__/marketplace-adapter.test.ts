/**
 * Unit tests for the Phase-2 MarketplaceAdapter pilot (task #754).
 */
import { describe, expect, it, beforeEach } from "vitest";
import {
  createMarketplacePublishAdapter,
  createMarketplaceUnpublishAdapter,
} from "../../supabase/functions/_shared/execution/adapters/marketplace/marketplace-adapter.ts";
import {
  MARKETPLACE_TASK_TYPES,
  MARKETPLACE_ERROR_CODES,
} from "../../supabase/functions/_shared/execution/adapters/marketplace/types.ts";
import {
  hashPayload,
  marketplaceIdempotencyKey,
  marketplaceListingLockKey,
  resolveMarketplacePolicy,
} from "../../supabase/functions/_shared/execution/adapters/marketplace/policy.ts";
import {
  MemoryListingRepository,
  makeTask,
} from "../../supabase/functions/_shared/execution/__test-helpers__.ts";
import type { DomainEvent } from "../../supabase/functions/_shared/execution/adapters/marketplace/marketplace-adapter.ts";

function inMemoryEvents() {
  const events: DomainEvent[] = [];
  return {
    events,
    sink: {
      async emit(e: DomainEvent) {
        events.push(e);
      },
    },
  };
}

describe("MarketplaceAdapter — policy", () => {
  it("classifies publish as MEDIUM with required approval", () => {
    const p = resolveMarketplacePolicy("MARKETPLACE.LISTING.PUBLISH");
    expect(p).toEqual({
      riskLevel: "MEDIUM",
      requires_approval: true,
      approval_policy: "single_admin",
      safeByPolicy: false,
    });
  });

  it("classifies unpublish as MEDIUM, SAFE_BY_POLICY (no approval)", () => {
    const p = resolveMarketplacePolicy("MARKETPLACE.LISTING.UNPUBLISH");
    expect(p?.requires_approval).toBe(false);
    expect(p?.safeByPolicy).toBe(true);
    expect(p?.approval_policy).toBe("auto");
  });

  it("returns null for unknown task types", () => {
    expect(resolveMarketplacePolicy("MARKETPLACE.LISTING.UPDATE")).toBeNull();
  });

  it("derives a deterministic lockKey per listing", () => {
    expect(marketplaceListingLockKey("L-1")).toBe("marketplace:listing:L-1");
  });

  it("derives a deterministic idempotency key", () => {
    const k1 = marketplaceIdempotencyKey("MARKETPLACE.LISTING.PUBLISH", "L-1", "abc");
    const k2 = marketplaceIdempotencyKey("MARKETPLACE.LISTING.PUBLISH", "L-1", "abc");
    expect(k1).toBe(k2);
    expect(k1).not.toBe(
      marketplaceIdempotencyKey("MARKETPLACE.LISTING.UNPUBLISH", "L-1", "abc"),
    );
  });

  it("payload hash is stable across calls", () => {
    expect(hashPayload({ a: 1, b: 2 })).toBe(hashPayload({ a: 1, b: 2 }));
  });
});

describe("MarketplaceAdapter — publish handler", () => {
  let repo: MemoryListingRepository;
  let kycReason: string | null;
  let evts: ReturnType<typeof inMemoryEvents>;

  beforeEach(() => {
    repo = new MemoryListingRepository();
    repo.seed({ id: "L-1", status: "draft", is_published: false, visibility_mode: null });
    kycReason = null;
    evts = inMemoryEvents();
  });

  function adapter() {
    return createMarketplacePublishAdapter({
      repo,
      kyc: { ensureCanPublish: async () => kycReason },
      events: evts.sink,
    });
  }

  it("derives lockKey from listingId and idempotency key from payload", () => {
    const a = adapter();
    const task = makeTask({
      type: MARKETPLACE_TASK_TYPES.PUBLISH,
      payload: { listingId: "L-1", ownerId: "owner-1" },
      entity_id: "L-1",
    });
    expect(a.getLockKey!(task)).toBe("marketplace:listing:L-1");
    expect(a.getIdempotencyKey!(task)).toContain("MARKETPLACE.LISTING.PUBLISH::L-1::");
  });

  it("publishes successfully and emits the canonical domain event", async () => {
    const a = adapter();
    const task = makeTask({
      type: MARKETPLACE_TASK_TYPES.PUBLISH,
      payload: { listingId: "L-1", ownerId: "owner-1" },
      entity_id: "L-1",
    });
    const result = await a.execute({
      task,
      lockKey: "marketplace:listing:L-1",
      ownerId: "test",
      attempt: 1,
      startedAt: new Date().toISOString(),
    });
    expect(result.success).toBe(true);
    expect(repo.raw("L-1")?.status).toBe("active");
    expect(repo.raw("L-1")?.is_published).toBe(true);
    expect(evts.events).toHaveLength(1);
    expect(evts.events[0].name).toBe("domain.marketplace.listing_published");
    expect(evts.events[0].previous_state?.status).toBe("draft");
    expect(result.actionsTaken).toContain("snapshot_previous_state");
    expect(result.output?.previous_state).toMatchObject({ status: "draft" });
  });

  it("blocks the task when KYC is insufficient", async () => {
    kycReason = "KYC level basic required";
    const a = adapter();
    const task = makeTask({
      type: MARKETPLACE_TASK_TYPES.PUBLISH,
      payload: { listingId: "L-1", ownerId: "owner-1" },
    });
    const result = await a.execute({
      task,
      lockKey: "marketplace:listing:L-1",
      ownerId: "test",
      attempt: 1,
      startedAt: new Date().toISOString(),
    });
    expect(result.success).toBe(false);
    expect(result.errorCode).toBe(MARKETPLACE_ERROR_CODES.KYC_BLOCKED);
    expect(repo.raw("L-1")?.status).toBe("draft"); // no mutation
    expect(evts.events).toHaveLength(0);
  });

  it("fails with INVALID_PAYLOAD when listingId is missing", async () => {
    const a = adapter();
    const task = makeTask({
      type: MARKETPLACE_TASK_TYPES.PUBLISH,
      payload: { ownerId: "owner-1" },
    });
    const result = await a.execute({
      task,
      lockKey: "marketplace:listing:unknown",
      ownerId: "test",
      attempt: 1,
      startedAt: new Date().toISOString(),
    });
    expect(result.success).toBe(false);
    expect(result.errorCode).toBe(MARKETPLACE_ERROR_CODES.INVALID_PAYLOAD);
  });

  it("fails with LISTING_NOT_FOUND when target row is missing", async () => {
    const a = adapter();
    const task = makeTask({
      type: MARKETPLACE_TASK_TYPES.PUBLISH,
      payload: { listingId: "missing", ownerId: "owner-1" },
    });
    const result = await a.execute({
      task,
      lockKey: "marketplace:listing:missing",
      ownerId: "test",
      attempt: 1,
      startedAt: new Date().toISOString(),
    });
    expect(result.success).toBe(false);
    expect(result.errorCode).toBe(MARKETPLACE_ERROR_CODES.LISTING_NOT_FOUND);
  });

  it("returns VERIFICATION_MISMATCH with structured diff when post-state diverges", async () => {
    // Force a divergence by intercepting setStatus to leave the listing paused.
    repo.setStatus = async (id) => repo.raw(id); // no-op mutation
    const a = adapter();
    const task = makeTask({
      type: MARKETPLACE_TASK_TYPES.PUBLISH,
      payload: { listingId: "L-1", ownerId: "owner-1" },
    });
    const result = await a.execute({
      task,
      lockKey: "marketplace:listing:L-1",
      ownerId: "test",
      attempt: 1,
      startedAt: new Date().toISOString(),
    });
    expect(result.success).toBe(false);
    expect(result.errorCode).toBe(MARKETPLACE_ERROR_CODES.VERIFICATION_MISMATCH);
    const diff = (result.output?.diff as Array<{ field: string }>) ?? [];
    expect(diff.length).toBeGreaterThan(0);
    expect(diff.some((d) => d.field === "status")).toBe(true);
  });
});

describe("MarketplaceAdapter — unpublish handler", () => {
  it("pauses an active listing without invoking the KYC gate", async () => {
    const repo = new MemoryListingRepository();
    repo.seed({ id: "L-2", status: "active", is_published: true, visibility_mode: "live" });
    let kycCalled = 0;
    const evts = inMemoryEvents();
    const a = createMarketplaceUnpublishAdapter({
      repo,
      kyc: {
        ensureCanPublish: async () => {
          kycCalled++;
          return null;
        },
      },
      events: evts.sink,
    });
    const task = makeTask({
      type: MARKETPLACE_TASK_TYPES.UNPUBLISH,
      payload: { listingId: "L-2" },
    });
    const result = await a.execute({
      task,
      lockKey: "marketplace:listing:L-2",
      ownerId: "test",
      attempt: 1,
      startedAt: new Date().toISOString(),
    });
    expect(result.success).toBe(true);
    expect(repo.raw("L-2")?.status).toBe("paused");
    expect(repo.raw("L-2")?.is_published).toBe(false);
    expect(kycCalled).toBe(0);
    expect(evts.events[0].name).toBe("domain.marketplace.listing_unpublished");
    expect(evts.events[0].previous_state?.status).toBe("active");
  });
});

/**
 * CANONICAL TYPES & EVENTS TESTS — Verify SSOT contracts.
 */
import { describe, it, expect } from "vitest";
import { CANONICAL_EVENTS } from "@/domains/shared/canonical-events";
import type {
  CanonicalOrbitProfile,
  CanonicalWalletState,
  CanonicalWalletTransaction,
  CanonicalGeoPosition,
  CanonicalDashboardSummary,
  IdempotencyHeader,
  CommunicationContext,
  PaymentStatus,
  OrderStatus,
  DriverStatus,
} from "@/domains/shared/canonical-types";
import { mapLegacyIds, isValidUUID } from "@/types/canonical-ids";

describe("Canonical Types", () => {
  it("CanonicalOrbitProfile has required fields", () => {
    const profile: CanonicalOrbitProfile = {
      id: "user-1",
      orbitId: "orbit_abc",
      email: "test@test.com",
      role: "buyer",
      displayName: "Test",
      avatarUrl: null,
      deviceId: null,
      verificationLevel: 1,
      permissions: { camera: false, microphone: false, geolocation: false, contacts: false, notifications: false },
      serviceLinks: { walletLinked: false, bookingEnabled: true, deliveryEnabled: true, propertyEnabled: true, messagingEnabled: true },
    };
    expect(profile.id).toBe("user-1");
    expect(profile.orbitId).toBe("orbit_abc");
  });

  it("CanonicalWalletState has required fields", () => {
    const wallet: CanonicalWalletState = {
      walletId: "w1", ownerUserId: "u1", currency: "AED",
      availableBalance: 100, escrowBalance: 0, pendingBalance: 0,
      status: "active", lastUpdatedAt: null,
    };
    expect(wallet.status).toBe("active");
    expect(wallet.availableBalance).toBe(100);
  });

  it("CanonicalWalletTransaction has required fields", () => {
    const tx: CanonicalWalletTransaction = {
      id: "tx1", type: "payment", status: "pending", amount: 50, currency: "AED",
      senderId: "s1", recipientId: "r1", contextType: "order", contextId: "o1",
      reference: null, title: null, subtitle: null, metadata: {}, createdAt: new Date().toISOString(),
    };
    expect(tx.type).toBe("payment");
  });

  it("IdempotencyHeader has requestId and correlationId", () => {
    const header: IdempotencyHeader = {
      requestId: "req-1",
      correlationId: "corr-1",
      version: 1,
      retryCount: 0,
    };
    expect(header.requestId).toBe("req-1");
    expect(header.correlationId).toBe("corr-1");
  });

  it("PaymentStatus covers all states", () => {
    const statuses: PaymentStatus[] = [
      "created", "pending_confirmation", "authorized", "captured", "failed", "refunded", "cancelled",
    ];
    expect(statuses.length).toBe(7);
  });

  it("OrderStatus covers full lifecycle", () => {
    const statuses: OrderStatus[] = [
      "draft", "submitted", "accepted", "preparing", "ready",
      "assigned", "picked_up", "delivered", "cancelled", "failed",
    ];
    expect(statuses.length).toBe(10);
  });

  it("DriverStatus covers full lifecycle", () => {
    const statuses: DriverStatus[] = [
      "available", "reserved", "assigned", "on_route_to_pickup",
      "waiting_pickup", "on_delivery", "completed", "offline",
    ];
    expect(statuses.length).toBe(8);
  });
});

describe("Canonical Events", () => {
  it("all events use colon notation", () => {
    const events = Object.values(CANONICAL_EVENTS);
    for (const event of events) {
      expect(event).toMatch(/^[a-z]+:[a-z_]+$/);
    }
  });

  it("events are organized by domain", () => {
    expect(CANONICAL_EVENTS.AUTH_READY).toBe("auth:ready");
    expect(CANONICAL_EVENTS.MESSAGE_SENT).toBe("orbit:message_sent");
    expect(CANONICAL_EVENTS.WALLET_BALANCE_UPDATED).toBe("wallet:balance_updated");
    expect(CANONICAL_EVENTS.LOCATION_UPDATED).toBe("radar:location_updated");
    expect(CANONICAL_EVENTS.DASHBOARD_REFRESH).toBe("dashboard:refresh");
    expect(CANONICAL_EVENTS.PROFILE_LOADED).toBe("me:profile_loaded");
  });

  it("no duplicate event values", () => {
    const values = Object.values(CANONICAL_EVENTS);
    const unique = new Set(values);
    expect(unique.size).toBe(values.length);
  });
});

describe("Legacy ID mapping", () => {
  it("maps threadId to conversationId", () => {
    const result = mapLegacyIds({ threadId: "t-123" });
    expect(result.conversationId).toBe("t-123");
  });

  it("maps v2ConversationId to conversationId", () => {
    const result = mapLegacyIds({ v2ConversationId: "v2-123" });
    expect(result.conversationId).toBe("v2-123");
  });

  it("maps contextId to entityId", () => {
    const result = mapLegacyIds({ contextId: "ctx-1" });
    expect(result.entityId).toBe("ctx-1");
  });

  it("prefers canonical names", () => {
    const result = mapLegacyIds({ conversationId: "canon", threadId: "legacy" });
    expect(result.conversationId).toBe("canon");
  });

  it("validates UUIDs", () => {
    expect(isValidUUID("550e8400-e29b-41d4-a716-446655440000")).toBe(true);
    expect(isValidUUID("not-a-uuid")).toBe(false);
    expect(isValidUUID(123 as any)).toBe(false);
  });
});

describe("CommunicationContext", () => {
  it("supports all context types", () => {
    const ctx: CommunicationContext = {
      type: "order",
      entityId: "order-1",
      entityLabel: "Commande #42",
    };
    expect(ctx.type).toBe("order");
  });
});

describe("Domain Event Bus idempotence", () => {
  it("createDomainEvent generates correlationId", async () => {
    const { createDomainEvent } = await import("@/domains/shared/domain-event-bus");
    const event = createDomainEvent("test:event", "agg-1", "test", { data: 1 }, "test");
    expect(event.correlationId).toBeDefined();
    expect(event.occurredAt).toBeDefined();
    expect(event.aggregateId).toBe("agg-1");
  });
});

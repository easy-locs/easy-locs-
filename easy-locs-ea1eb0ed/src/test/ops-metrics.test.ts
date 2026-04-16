import { describe, it, expect } from "vitest";
import { aggregateOpsDashboard } from "@/domains/admin/ops-metrics";

const base = () => ({
  rides: [
    {
      status: "completed",
      createdAt: "2026-04-16T10:00:00Z",
      acceptedAt: "2026-04-16T10:00:30Z",
      completedAt: "2026-04-16T10:15:00Z",
      price: 42,
      currency: "AED",
    },
    {
      status: "searching",
      createdAt: "2026-04-16T10:10:00Z",
      acceptedAt: null,
      completedAt: null,
      price: 0,
      currency: "AED",
    },
    {
      status: "completed",
      createdAt: "2026-04-16T10:00:00Z",
      acceptedAt: "2026-04-16T10:02:00Z",
      completedAt: "2026-04-16T10:20:00Z",
      price: 30,
      currency: "AED",
    },
  ],
  deliveries: [
    { status: "in_progress", etaMinutes: 20, slaMinutes: 30, createdAt: "x" },
    { status: "in_progress", etaMinutes: 40, slaMinutes: 30, createdAt: "x" },
    { status: "delivered", etaMinutes: 15, slaMinutes: 30, createdAt: "x" },
  ],
  payments: [
    { status: "succeeded" as const, amount: 42, currency: "AED", webhookAttempts: 1 },
    { status: "succeeded" as const, amount: 30, currency: "AED", webhookAttempts: 2 },
    { status: "failed" as const, amount: 12, currency: "AED", webhookAttempts: 3 },
  ],
  orbit: { p95DeliveryMs: 220, reconnectCount: 2, windowSeconds: 60 },
});

describe("admin/ops-metrics", () => {
  it("aggregates rides by status", () => {
    const d = aggregateOpsDashboard(base());
    expect(d.rides.byStatus.completed).toBe(2);
    expect(d.rides.byStatus.searching).toBe(1);
    expect(d.rides.total).toBe(3);
  });

  it("computes median wait from accepted rides", () => {
    const d = aggregateOpsDashboard(base());
    // wait times are 30s and 120s → median = 75
    expect(d.rides.medianWaitSeconds).toBe(75);
  });

  it("computes acceptance rate", () => {
    const d = aggregateOpsDashboard(base());
    expect(d.rides.acceptanceRate).toBeCloseTo(2 / 3, 2);
  });

  it("gross revenue only counted for completed rides", () => {
    const d = aggregateOpsDashboard(base());
    expect(d.rides.grossByCurrency.AED).toBe(72);
  });

  it("delivery late rate detects slow ETA", () => {
    const d = aggregateOpsDashboard(base());
    expect(d.deliveries.lateRate).toBeCloseTo(1 / 3, 2);
    expect(d.deliveries.inProgress).toBe(2);
  });

  it("payment success rate ignores failures", () => {
    const d = aggregateOpsDashboard(base());
    expect(d.payments.successRate).toBeCloseTo(2 / 3, 2);
    expect(d.payments.failureCount).toBe(1);
    expect(d.payments.webhookRetrySum).toBe(6);
  });

  it("orbit reconnects normalized per minute", () => {
    const d = aggregateOpsDashboard(base());
    expect(d.orbit.p95DeliveryMs).toBe(220);
    expect(d.orbit.reconnectsPerMinute).toBe(2);
  });

  it("handles empty input safely", () => {
    const d = aggregateOpsDashboard({
      rides: [],
      deliveries: [],
      payments: [],
      orbit: { p95DeliveryMs: 0, reconnectCount: 0, windowSeconds: 0 },
    });
    expect(d.rides.total).toBe(0);
    expect(d.rides.acceptanceRate).toBe(0);
    expect(d.payments.successRate).toBe(0);
    expect(d.orbit.reconnectsPerMinute).toBe(0);
  });
});

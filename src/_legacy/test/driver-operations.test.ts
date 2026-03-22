/**
 * Tests — Driver Operational System (PASS69 Block B)
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  DriverStatusManager,
  calculateEarnings,
  dailyEarnings,
  generateHeatmap,
  getHotZones,
  isValidTransition,
  transitionMission,
  type Mission,
  type MissionStatus,
} from "@/lib/driver-operations";

// ─── Fixtures ────────────────────────────────────────────────────────────────

const baseMission = (overrides: Partial<Mission> = {}): Mission => ({
  id: "m1",
  driverId: "d1",
  jobId: "j1",
  status: "delivered",
  pickupLat: 48.85,
  pickupLng: 2.35,
  dropoffLat: 48.87,
  dropoffLng: 2.37,
  distanceKm: 3.5,
  assignedAt: Date.now() - 3600000,
  acceptedAt: Date.now() - 3500000,
  pickedUpAt: Date.now() - 3000000,
  deliveredAt: Date.now() - 1800000,
  cancelledAt: null,
  cancellationReason: null,
  earnings: 8.50,
  currency: "EUR",
  tip: 2.00,
  rating: 4.5,
  customerFeedback: "Great!",
  ...overrides,
});

// ─── DriverStatusManager ─────────────────────────────────────────────────────

describe("DriverStatusManager", () => {
  let manager: DriverStatusManager;

  beforeEach(() => {
    manager = new DriverStatusManager();
  });

  it("goes online and returns session", () => {
    const s = manager.goOnline("d1", 48.85, 2.35);
    expect(s.status).toBe("online");
    expect(s.driverId).toBe("d1");
  });

  it("goes offline and returns final session", () => {
    manager.goOnline("d1", 48.85, 2.35);
    const s = manager.goOffline("d1");
    expect(s).not.toBeNull();
    expect(s!.status).toBe("offline");
  });

  it("returns null for unknown driver offline", () => {
    expect(manager.goOffline("unknown")).toBeNull();
  });

  it("heartbeat updates position", () => {
    manager.goOnline("d1", 48.85, 2.35);
    const s = manager.heartbeat("d1", 48.86, 2.36);
    expect(s!.lat).toBe(48.86);
    expect(s!.lng).toBe(2.36);
  });

  it("setStatus changes status", () => {
    manager.goOnline("d1", 48.85, 2.35);
    manager.setStatus("d1", "on_delivery", "job-1");
    const s = manager.getSession("d1");
    expect(s!.status).toBe("on_delivery");
    expect(s!.currentJobId).toBe("job-1");
  });

  it("getOnlineDrivers returns active sessions", () => {
    manager.goOnline("d1", 48.85, 2.35);
    manager.goOnline("d2", 48.86, 2.36);
    expect(manager.getOnlineDrivers()).toHaveLength(2);
  });

  it("getStatusCounts aggregates correctly", () => {
    manager.goOnline("d1", 48.85, 2.35);
    manager.goOnline("d2", 48.86, 2.36);
    manager.setStatus("d2", "busy");
    const counts = manager.getStatusCounts();
    expect(counts.online).toBe(1);
    expect(counts.busy).toBe(1);
  });

  it("purgeStale removes timed-out sessions", () => {
    manager.goOnline("d1", 48.85, 2.35);
    // Manually set heartbeat to old time
    const session = manager.getSession("d1")!;
    session.lastHeartbeatAt = Date.now() - 10 * 60 * 1000; // 10 min ago

    const purged = manager.purgeStale();
    expect(purged).toContain("d1");
    expect(manager.getSession("d1")).toBeNull();
  });
});

// ─── Earnings ────────────────────────────────────────────────────────────────

describe("calculateEarnings", () => {
  it("calculates summary from missions", () => {
    const missions = [
      baseMission({ id: "m1", earnings: 10, tip: 2, distanceKm: 5, rating: 4 }),
      baseMission({ id: "m2", earnings: 15, tip: 3, distanceKm: 8, rating: 5 }),
      baseMission({ id: "m3", status: "cancelled", earnings: 0, tip: 0, distanceKm: 0 }),
    ];
    const summary = calculateEarnings(missions);
    expect(summary.totalEarnings).toBe(25);
    expect(summary.totalTips).toBe(5);
    expect(summary.completedMissions).toBe(2);
    expect(summary.cancelledMissions).toBe(1);
    expect(summary.avgEarningsPerMission).toBe(12.5);
    expect(summary.avgRating).toBe(4.5);
    expect(summary.totalDistanceKm).toBe(13);
  });

  it("handles empty missions", () => {
    const summary = calculateEarnings([]);
    expect(summary.totalMissions).toBe(0);
    expect(summary.avgRating).toBe(0);
  });
});

describe("dailyEarnings", () => {
  it("groups by day", () => {
    const t1 = new Date("2026-03-15T10:00:00Z").getTime();
    const t2 = new Date("2026-03-15T14:00:00Z").getTime();
    const t3 = new Date("2026-03-16T10:00:00Z").getTime();

    const missions = [
      baseMission({ id: "m1", deliveredAt: t1, earnings: 10, tip: 1, distanceKm: 3 }),
      baseMission({ id: "m2", deliveredAt: t2, earnings: 12, tip: 2, distanceKm: 4 }),
      baseMission({ id: "m3", deliveredAt: t3, earnings: 8, tip: 0, distanceKm: 2 }),
    ];
    const daily = dailyEarnings(missions);
    expect(daily).toHaveLength(2);
    expect(daily[0].date).toBe("2026-03-15");
    expect(daily[0].earnings).toBe(22);
    expect(daily[0].missions).toBe(2);
  });
});

// ─── Heatmap ─────────────────────────────────────────────────────────────────

describe("generateHeatmap", () => {
  it("generates heatmap cells from coordinates", () => {
    const coords = [
      { lat: 48.856, lng: 2.352 },
      { lat: 48.856, lng: 2.352 },
      { lat: 48.856, lng: 2.352 },
      { lat: 48.870, lng: 2.340 },
    ];
    const heatmap = generateHeatmap(coords);
    expect(heatmap.length).toBeGreaterThanOrEqual(1);
    const hottest = heatmap.reduce((a, b) => (a.orderCount > b.orderCount ? a : b));
    expect(hottest.orderCount).toBe(3);
    expect(hottest.intensity).toBe(1);
  });

  it("filters below minOrders", () => {
    const coords = [
      { lat: 48.856, lng: 2.352 },
      { lat: 48.870, lng: 2.340 },
    ];
    const heatmap = generateHeatmap(coords, { cellSize: 0.005, minOrders: 2 });
    expect(heatmap.length).toBe(0);
  });
});

describe("getHotZones", () => {
  it("returns top N cells", () => {
    const cells = [
      { lat: 1, lng: 1, intensity: 0.5, orderCount: 5 },
      { lat: 2, lng: 2, intensity: 1, orderCount: 10 },
      { lat: 3, lng: 3, intensity: 0.3, orderCount: 3 },
    ];
    const hot = getHotZones(cells, 2);
    expect(hot).toHaveLength(2);
    expect(hot[0].orderCount).toBe(10);
  });
});

// ─── Mission State Machine ──────────────────────────────────────────────────

describe("isValidTransition", () => {
  const valid: [MissionStatus, MissionStatus][] = [
    ["assigned", "accepted"],
    ["assigned", "cancelled"],
    ["accepted", "heading_to_pickup"],
    ["heading_to_pickup", "at_pickup"],
    ["at_pickup", "in_transit"],
    ["in_transit", "delivered"],
    ["in_transit", "failed"],
  ];

  it.each(valid)("%s → %s is valid", (from, to) => {
    expect(isValidTransition(from, to)).toBe(true);
  });

  const invalid: [MissionStatus, MissionStatus][] = [
    ["delivered", "cancelled"],
    ["cancelled", "accepted"],
    ["assigned", "delivered"],
    ["in_transit", "assigned"],
  ];

  it.each(invalid)("%s → %s is invalid", (from, to) => {
    expect(isValidTransition(from, to)).toBe(false);
  });
});

describe("transitionMission", () => {
  it("transitions assigned → accepted", () => {
    const m = baseMission({ status: "assigned", acceptedAt: null });
    const updated = transitionMission(m, "accepted");
    expect(updated.status).toBe("accepted");
    expect(updated.acceptedAt).not.toBeNull();
  });

  it("transitions in_transit → delivered with rating", () => {
    const m = baseMission({ status: "in_transit", deliveredAt: null, rating: null });
    const updated = transitionMission(m, "delivered", { rating: 5, tip: 3 });
    expect(updated.status).toBe("delivered");
    expect(updated.rating).toBe(5);
    expect(updated.tip).toBe(3);
  });

  it("transitions to cancelled with reason", () => {
    const m = baseMission({ status: "accepted" });
    const updated = transitionMission(m, "cancelled", { cancellationReason: "Customer unreachable" });
    expect(updated.cancellationReason).toBe("Customer unreachable");
  });

  it("throws on invalid transition", () => {
    const m = baseMission({ status: "delivered" });
    expect(() => transitionMission(m, "cancelled")).toThrow("Invalid transition");
  });
});

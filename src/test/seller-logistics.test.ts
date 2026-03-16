/**
 * Tests — Seller Logistics Engine (PASS69 Block C)
 */
import { describe, it, expect } from "vitest";
import {
  createMission,
  transitionDeliveryMission,
  assignDriver,
  isValidMissionTransition,
  createDispute,
  resolveDispute,
  escalateDispute,
  calculateSellerMetrics,
} from "@/lib/seller-logistics";

const mission = () => createMission({
  sellerId: "s1", orgId: "org1", orderId: "o1",
  pickupAddress: "123 Rue A", pickupLat: 48.85, pickupLng: 2.35,
  dropoffAddress: "456 Rue B", dropoffLat: 48.87, dropoffLng: 2.37,
  packageDescription: "Books", weightKg: 2, deliveryFee: 5.50,
});

describe("createMission", () => {
  it("creates a draft mission", () => {
    const m = mission();
    expect(m.status).toBe("draft");
    expect(m.driverId).toBeNull();
    expect(m.history).toHaveLength(1);
  });
});

describe("isValidMissionTransition", () => {
  it("draft → pending_assignment valid", () => expect(isValidMissionTransition("draft", "pending_assignment")).toBe(true));
  it("draft → completed invalid", () => expect(isValidMissionTransition("draft", "completed")).toBe(false));
  it("assigned → pending_assignment valid (reassign)", () => expect(isValidMissionTransition("assigned", "pending_assignment")).toBe(true));
  it("cancelled → assigned invalid", () => expect(isValidMissionTransition("cancelled", "assigned")).toBe(false));
});

describe("transitionDeliveryMission", () => {
  it("transitions draft → pending_assignment", () => {
    const m = mission();
    const updated = transitionDeliveryMission(m, "pending_assignment", "s1");
    expect(updated.status).toBe("pending_assignment");
    expect(updated.history).toHaveLength(2);
  });

  it("throws on invalid transition", () => {
    const m = mission();
    expect(() => transitionDeliveryMission(m, "completed", "s1")).toThrow();
  });

  it("handles cancellation with reason", () => {
    const m = mission();
    const cancelled = transitionDeliveryMission(m, "cancelled", "s1", { cancellationReason: "Out of stock" });
    expect(cancelled.cancelledBy).toBe("s1");
    expect(cancelled.cancellationReason).toBe("Out of stock");
  });
});

describe("assignDriver", () => {
  it("assigns from draft", () => {
    const m = mission();
    const assigned = assignDriver(m, "driver-1", "s1");
    expect(assigned.status).toBe("assigned");
    expect(assigned.driverId).toBe("driver-1");
    expect(assigned.history.length).toBeGreaterThanOrEqual(3); // draft → pending → assigned
  });

  it("reassigns from assigned", () => {
    const m = assignDriver(mission(), "driver-1", "s1");
    const reassigned = assignDriver(m, "driver-2", "s1");
    expect(reassigned.driverId).toBe("driver-2");
    expect(reassigned.reassignmentCount).toBe(1);
  });

  it("throws for invalid status", () => {
    const m = mission();
    const cancelled = transitionDeliveryMission(m, "cancelled", "s1");
    expect(() => assignDriver(cancelled, "driver-1", "s1")).toThrow();
  });
});

describe("Disputes", () => {
  it("creates and resolves a dispute", () => {
    const d = createDispute({
      missionId: "m1", raisedBy: "buyer1", raisedByRole: "buyer",
      reason: "item_damaged", description: "Box was crushed",
    });
    expect(d.status).toBe("open");

    const resolved = resolveDispute(d, "Refund issued");
    expect(resolved.status).toBe("resolved");
    expect(resolved.resolution).toBe("Refund issued");
  });

  it("escalates a dispute", () => {
    const d = createDispute({
      missionId: "m1", raisedBy: "s1", raisedByRole: "seller",
      reason: "no_delivery", description: "Never arrived",
    });
    const escalated = escalateDispute(d);
    expect(escalated.status).toBe("escalated");
  });

  it("cannot resolve already resolved dispute", () => {
    const d = resolveDispute(
      createDispute({ missionId: "m1", raisedBy: "b1", raisedByRole: "buyer", reason: "other", description: "test" }),
      "Done"
    );
    expect(() => resolveDispute(d, "Again")).toThrow();
  });
});

describe("calculateSellerMetrics", () => {
  it("calculates metrics correctly", () => {
    const m1 = assignDriver(mission(), "d1", "s1");

    const m2Base = createMission({
      sellerId: "s1", orgId: "org1", orderId: "o2",
      pickupAddress: "A", pickupLat: 48.85, pickupLng: 2.35,
      dropoffAddress: "B", dropoffLat: 48.87, dropoffLng: 2.37,
      packageDescription: "P", weightKg: 1, deliveryFee: 8,
    });
    const m2Assigned = assignDriver(m2Base, "d1", "s1");
    const m2Accepted = transitionDeliveryMission(m2Assigned, "accepted", "d1");
    const m2InProgress = transitionDeliveryMission(m2Accepted, "in_progress", "d1");
    const m2Completed = transitionDeliveryMission(m2InProgress, "completed", "d1");

    const metrics = calculateSellerMetrics([m1, m2Completed]);
    expect(metrics.totalMissions).toBe(2);
    expect(metrics.pending).toBe(1);
    expect(metrics.completed).toBe(1);
    expect(metrics.totalRevenue).toBe(8);
  });
});

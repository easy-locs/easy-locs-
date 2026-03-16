/**
 * Tests — Buyer Delivery Experience (PASS69 Block D)
 */
import { describe, it, expect } from "vitest";
import {
  generateConfirmationCode,
  validateConfirmationCode,
  createTracking,
  updateTrackingStatus,
  updateDriverPosition,
  getTrackingProgress,
  createDeliveryProof,
  createDriverRating,
  aggregateRatings,
  createSupportRequest,
  resolveSupportRequest,
  autoPrioritize,
} from "@/lib/buyer-delivery";

// ─── Confirmation Code ──────────────────────────────────────────────────────

describe("generateConfirmationCode", () => {
  it("generates 6-digit code", () => {
    const code = generateConfirmationCode();
    expect(code).toMatch(/^\d{6}$/);
  });

  it("generates unique codes", () => {
    const codes = new Set(Array.from({ length: 100 }, () => generateConfirmationCode()));
    expect(codes.size).toBeGreaterThan(90);
  });
});

describe("validateConfirmationCode", () => {
  it("validates matching codes", () => {
    expect(validateConfirmationCode("123456", "123456")).toBe(true);
  });

  it("rejects wrong codes", () => {
    expect(validateConfirmationCode("123456", "654321")).toBe(false);
  });

  it("rejects different lengths", () => {
    expect(validateConfirmationCode("12345", "123456")).toBe(false);
  });
});

// ─── Tracking ────────────────────────────────────────────────────────────────

describe("createTracking", () => {
  it("creates tracking with confirmation code", () => {
    const t = createTracking({
      orderId: "o1", missionId: "m1",
      driverName: "Ali", driverRating: 4.5, vehicleType: "scooter",
      currentLat: 48.85, currentLng: 2.35, dropoffLat: 48.87, dropoffLng: 2.37,
    });
    expect(t.status).toBe("order_confirmed");
    expect(t.confirmationCode).toMatch(/^\d{6}$/);
    expect(t.timeline).toHaveLength(1);
  });
});

describe("updateTrackingStatus", () => {
  it("advances status forward", () => {
    let t = createTracking({
      orderId: "o1", missionId: "m1",
      driverName: "Ali", driverRating: 4.5, vehicleType: "scooter",
      currentLat: 48.85, currentLng: 2.35, dropoffLat: 48.87, dropoffLng: 2.37,
    });
    t = updateTrackingStatus(t, "driver_assigned");
    expect(t.status).toBe("driver_assigned");
    expect(t.timeline).toHaveLength(2);
  });

  it("rejects backward transition", () => {
    let t = createTracking({
      orderId: "o1", missionId: "m1",
      driverName: "Ali", driverRating: 4.5, vehicleType: "scooter",
      currentLat: 48.85, currentLng: 2.35, dropoffLat: 48.87, dropoffLng: 2.37,
    });
    t = updateTrackingStatus(t, "in_transit");
    expect(() => updateTrackingStatus(t, "driver_assigned")).toThrow();
  });
});

describe("updateDriverPosition", () => {
  it("updates position and calculates ETA", () => {
    const t = createTracking({
      orderId: "o1", missionId: "m1",
      driverName: "Ali", driverRating: 4.5, vehicleType: "scooter",
      currentLat: 48.85, currentLng: 2.35, dropoffLat: 48.87, dropoffLng: 2.37,
    });
    const updated = updateDriverPosition(t, 48.86, 2.36);
    expect(updated.currentLat).toBe(48.86);
    expect(updated.distanceRemainingKm).toBeGreaterThan(0);
    expect(updated.estimatedArrivalMinutes).toBeGreaterThanOrEqual(0);
  });
});

describe("getTrackingProgress", () => {
  it("0% at order_confirmed", () => {
    const t = createTracking({
      orderId: "o1", missionId: "m1",
      driverName: "Ali", driverRating: 4.5, vehicleType: "scooter",
      currentLat: 48.85, currentLng: 2.35, dropoffLat: 48.87, dropoffLng: 2.37,
    });
    expect(getTrackingProgress(t)).toBe(0);
  });

  it("100% at delivered", () => {
    let t = createTracking({
      orderId: "o1", missionId: "m1",
      driverName: "Ali", driverRating: 4.5, vehicleType: "scooter",
      currentLat: 48.85, currentLng: 2.35, dropoffLat: 48.87, dropoffLng: 2.37,
    });
    t = updateTrackingStatus(t, "delivered");
    expect(getTrackingProgress(t)).toBe(100);
  });
});

// ─── Delivery Proof ──────────────────────────────────────────────────────────

describe("createDeliveryProof", () => {
  it("validates correct code", () => {
    const { proof, codeValid } = createDeliveryProof({
      missionId: "m1", photoUrl: "https://photo.jpg",
      confirmationCode: "123456", expectedCode: "123456",
    });
    expect(codeValid).toBe(true);
    expect(proof.confirmedByCode).toBe(true);
  });

  it("rejects wrong code", () => {
    const { codeValid } = createDeliveryProof({
      missionId: "m1", photoUrl: "https://photo.jpg",
      confirmationCode: "111111", expectedCode: "222222",
    });
    expect(codeValid).toBe(false);
  });
});

// ─── Driver Rating ───────────────────────────────────────────────────────────

describe("createDriverRating", () => {
  it("creates valid rating", () => {
    const r = createDriverRating({
      missionId: "m1", driverId: "d1", buyerId: "b1",
      rating: 5, categories: ["speed", "friendliness"],
    });
    expect(r.rating).toBe(5);
    expect(r.categories).toHaveLength(2);
  });

  it("rejects out of range", () => {
    expect(() => createDriverRating({
      missionId: "m1", driverId: "d1", buyerId: "b1", rating: 6,
    })).toThrow();
  });
});

describe("aggregateRatings", () => {
  it("aggregates multiple ratings", () => {
    const ratings = [
      createDriverRating({ missionId: "m1", driverId: "d1", buyerId: "b1", rating: 5, categories: ["speed"] }),
      createDriverRating({ missionId: "m2", driverId: "d1", buyerId: "b2", rating: 4, categories: ["speed", "friendliness"] }),
      createDriverRating({ missionId: "m3", driverId: "d1", buyerId: "b3", rating: 3 }),
    ];
    const agg = aggregateRatings(ratings);
    expect(agg.avgRating).toBe(4);
    expect(agg.totalRatings).toBe(3);
    expect(agg.distribution[5]).toBe(1);
    expect(agg.topCategories[0].category).toBe("speed");
  });

  it("handles empty ratings", () => {
    const agg = aggregateRatings([]);
    expect(agg.avgRating).toBe(0);
    expect(agg.totalRatings).toBe(0);
  });
});

// ─── Support Requests ────────────────────────────────────────────────────────

describe("createSupportRequest", () => {
  it("creates request with auto-priority", () => {
    const r = createSupportRequest({
      missionId: "m1", userId: "b1", userRole: "buyer",
      category: "damaged_item", subject: "Box crushed", description: "Details...",
    });
    expect(r.status).toBe("open");
  });
});

describe("resolveSupportRequest", () => {
  it("resolves open request", () => {
    const r = createSupportRequest({
      missionId: "m1", userId: "b1", userRole: "buyer",
      category: "other", subject: "Q", description: "D",
    });
    const resolved = resolveSupportRequest(r, "Issue fixed");
    expect(resolved.status).toBe("resolved");
    expect(resolved.resolvedAt).not.toBeNull();
  });

  it("rejects re-resolve", () => {
    const r = resolveSupportRequest(
      createSupportRequest({
        missionId: "m1", userId: "b1", userRole: "buyer",
        category: "other", subject: "Q", description: "D",
      }),
      "Done"
    );
    expect(() => resolveSupportRequest(r, "Again")).toThrow();
  });
});

describe("autoPrioritize", () => {
  it("missing_item → high", () => expect(autoPrioritize("missing_item")).toBe("high"));
  it("payment_issue → medium", () => expect(autoPrioritize("payment_issue")).toBe("medium"));
  it("other → low", () => expect(autoPrioritize("other")).toBe("low"));
});

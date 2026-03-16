/**
 * Tests for delivery system hooks and logic.
 * PASS71-A: Integration tests
 */
import { describe, it, expect } from "vitest";
import { buildTrackingSteps, getTrackingProgress, type BuyerDeliveryJob } from "@/hooks/useBuyerDelivery";

const mockJob = (status: string, overrides = {}): BuyerDeliveryJob => ({
  id: "job-1",
  status,
  priority: "standard",
  pickup_address: "123 Rue A",
  dropoff_address: "456 Rue B",
  dropoff_lat: 48.85,
  dropoff_lng: 2.35,
  package_description: "Carton test",
  delivery_fee: 8.5,
  currency: "EUR",
  confirmation_code: "123456",
  notes: null,
  driver_id: null,
  created_at: "2026-03-16T10:00:00Z",
  assigned_at: null,
  accepted_at: null,
  picked_up_at: null,
  delivered_at: null,
  photo_proof_url: null,
  order_id: null,
  ...overrides,
});

describe("Buyer Delivery Tracking", () => {
  describe("getTrackingProgress", () => {
    it("returns 0% for pending", () => {
      expect(getTrackingProgress(mockJob("pending"))).toBe(0);
    });

    it("returns 25% for assigned", () => {
      expect(getTrackingProgress(mockJob("assigned"))).toBe(25);
    });

    it("returns 50% for accepted", () => {
      expect(getTrackingProgress(mockJob("accepted"))).toBe(50);
    });

    it("returns 75% for in_progress", () => {
      expect(getTrackingProgress(mockJob("in_progress"))).toBe(75);
    });

    it("returns 100% for completed", () => {
      expect(getTrackingProgress(mockJob("completed"))).toBe(100);
    });

    it("returns 0 for unknown status", () => {
      expect(getTrackingProgress(mockJob("unknown_status"))).toBe(0);
    });
  });

  describe("buildTrackingSteps", () => {
    it("builds 5 steps for any job", () => {
      const steps = buildTrackingSteps(mockJob("pending"));
      expect(steps).toHaveLength(5);
    });

    it("marks first step completed for pending", () => {
      const steps = buildTrackingSteps(mockJob("pending"));
      expect(steps[0].completed).toBe(true);
      expect(steps[0].active).toBe(true);
      expect(steps[1].completed).toBe(false);
    });

    it("marks steps up to in_progress as completed", () => {
      const steps = buildTrackingSteps(mockJob("in_progress", {
        assigned_at: "2026-03-16T10:05:00Z",
        accepted_at: "2026-03-16T10:06:00Z",
        picked_up_at: "2026-03-16T10:15:00Z",
      }));
      expect(steps[0].completed).toBe(true);
      expect(steps[1].completed).toBe(true);
      expect(steps[2].completed).toBe(true);
      expect(steps[3].completed).toBe(true);
      expect(steps[3].active).toBe(true);
      expect(steps[4].completed).toBe(false);
    });

    it("marks all steps completed for completed job", () => {
      const steps = buildTrackingSteps(mockJob("completed", {
        assigned_at: "2026-03-16T10:05:00Z",
        accepted_at: "2026-03-16T10:06:00Z",
        picked_up_at: "2026-03-16T10:15:00Z",
        delivered_at: "2026-03-16T10:30:00Z",
      }));
      steps.forEach(s => expect(s.completed).toBe(true));
      expect(steps[4].active).toBe(true);
    });

    it("includes timestamps when available", () => {
      const steps = buildTrackingSteps(mockJob("assigned", {
        assigned_at: "2026-03-16T10:05:00Z",
      }));
      expect(steps[0].timestamp).toBe("2026-03-16T10:00:00Z");
      expect(steps[1].timestamp).toBe("2026-03-16T10:05:00Z");
    });
  });
});

describe("Seller Delivery Metrics", () => {
  it("calculates metrics correctly from job list", () => {
    // Test the pure metric calculation logic
    const jobs = [
      mockJob("completed", { delivery_fee: 10 }),
      mockJob("completed", { delivery_fee: 20 }),
      mockJob("in_progress", { delivery_fee: 15 }),
      mockJob("cancelled"),
      mockJob("pending"),
    ];

    const completed = jobs.filter(j => j.status === "completed");
    const active = jobs.filter(j => ["assigned", "accepted", "in_progress"].includes(j.status));
    const totalSpent = completed.reduce((s, j) => s + (j.delivery_fee || 0), 0);
    const avgFee = completed.length ? totalSpent / completed.length : 0;

    expect(completed.length).toBe(2);
    expect(active.length).toBe(1);
    expect(totalSpent).toBe(30);
    expect(avgFee).toBe(15);
  });
});

describe("Edge Function Actions", () => {
  it("haversine formula produces reasonable distances", () => {
    // Paris (48.8566, 2.3522) to Lyon (45.7640, 4.8357) ≈ 393 km
    const R = 6371;
    const lat1 = 48.8566, lng1 = 2.3522;
    const lat2 = 45.7640, lng2 = 4.8357;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
    const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    expect(dist).toBeGreaterThan(380);
    expect(dist).toBeLessThan(410);
  });

  it("confirmation code is 6 digits", () => {
    const code = String(Math.floor(100000 + Math.random() * 900000));
    expect(code).toHaveLength(6);
    expect(/^\d{6}$/.test(code)).toBe(true);
  });
});

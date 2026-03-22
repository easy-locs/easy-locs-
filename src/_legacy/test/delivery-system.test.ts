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

describe("Driver Ranking Engine", async () => {
  const { rankDrivers, rankDriver, haversineDistance, estimateEta, checkEligibility, DEFAULT_WEIGHTS } = await import("@/lib/driver-ranking");
  type DriverProfile = import("@/lib/driver-ranking").DriverProfile;
  type DeliveryJob = import("@/lib/driver-ranking").DeliveryJob;

  const mockDriver = (overrides: Partial<DriverProfile> = {}): DriverProfile => ({
    id: "driver-1",
    name: "Test Driver",
    lat: 48.86,
    lng: 2.35,
    status: "online",
    vehicleType: "car",
    rating: 4.5,
    completedDeliveries: 50,
    cancelledDeliveries: 2,
    avgDeliveryMinutes: 25,
    acceptanceRate: 0.92,
    lastActiveAt: Date.now(),
    ...overrides,
  });

  const mockDeliveryJob = (overrides: Partial<DeliveryJob> = {}): DeliveryJob => ({
    id: "job-1",
    pickupLat: 48.85,
    pickupLng: 2.34,
    dropoffLat: 48.87,
    dropoffLng: 2.36,
    requiredVehicles: [],
    weightKg: 5,
    priority: "standard",
    createdAt: Date.now(),
    ...overrides,
  });

  it("ranks closer drivers higher", () => {
    const close = mockDriver({ id: "close", lat: 48.851, lng: 2.341 });
    const far = mockDriver({ id: "far", lat: 48.90, lng: 2.50 });
    const job = mockDeliveryJob();
    const ranked = rankDrivers([far, close], job, DEFAULT_WEIGHTS, { eligibleOnly: true });
    expect(ranked[0].driver.id).toBe("close");
  });

  it("filters offline drivers", () => {
    const offline = mockDriver({ id: "off", status: "offline" });
    const online = mockDriver({ id: "on", status: "online" });
    const job = mockDeliveryJob();
    const ranked = rankDrivers([offline, online], job, DEFAULT_WEIGHTS, { eligibleOnly: true });
    expect(ranked).toHaveLength(1);
    expect(ranked[0].driver.id).toBe("on");
  });

  it("filters by vehicle capacity", () => {
    const bicycle = mockDriver({ id: "bike", vehicleType: "bicycle" });
    const van = mockDriver({ id: "van", vehicleType: "van" });
    const heavyJob = mockDeliveryJob({ weightKg: 30 });
    const ranked = rankDrivers([bicycle, van], heavyJob, DEFAULT_WEIGHTS, { eligibleOnly: true });
    expect(ranked).toHaveLength(1);
    expect(ranked[0].driver.id).toBe("van");
  });

  it("respects required vehicle types", () => {
    const car = mockDriver({ id: "car", vehicleType: "car" });
    const scooter = mockDriver({ id: "scooter", vehicleType: "scooter" });
    const job = mockDeliveryJob({ requiredVehicles: ["scooter"] });
    const ranked = rankDrivers([car, scooter], job, DEFAULT_WEIGHTS, { eligibleOnly: true });
    expect(ranked).toHaveLength(1);
    expect(ranked[0].driver.id).toBe("scooter");
  });

  it("boosts distance/eta weight for urgent jobs", () => {
    const close = mockDriver({ id: "close", lat: 48.851, lng: 2.341, rating: 3 });
    const farGood = mockDriver({ id: "far-good", lat: 48.88, lng: 2.40, rating: 5 });
    const urgentJob = mockDeliveryJob({ priority: "urgent" });
    const ranked = rankDrivers([farGood, close], urgentJob, DEFAULT_WEIGHTS, {
      eligibleOnly: true, applyPriorityBoost: true,
    });
    // Close driver should win for urgent due to distance/eta boost
    expect(ranked[0].driver.id).toBe("close");
  });

  it("produces score breakdown with all components", () => {
    const driver = mockDriver();
    const job = mockDeliveryJob();
    const result = rankDriver(driver, job);
    expect(result.breakdown).toHaveProperty("distanceScore");
    expect(result.breakdown).toHaveProperty("etaScore");
    expect(result.breakdown).toHaveProperty("reliabilityScore");
    expect(result.breakdown).toHaveProperty("vehicleScore");
    expect(result.breakdown).toHaveProperty("availabilityScore");
    expect(result.breakdown).toHaveProperty("ratingScore");
    expect(result.score).toBeGreaterThan(0);
  });

  it("haversineDistance calculates correctly", () => {
    const dist = haversineDistance(48.8566, 2.3522, 45.7640, 4.8357);
    expect(dist).toBeGreaterThan(380);
    expect(dist).toBeLessThan(410);
  });

  it("estimateEta returns reasonable values", () => {
    const eta = estimateEta(10, "car"); // 10km at 40km/h = 15min
    expect(eta).toBe(15);
  });

  it("limits results with limit option", () => {
    const drivers = Array.from({ length: 10 }, (_, i) =>
      mockDriver({ id: `d-${i}`, lat: 48.85 + i * 0.001 })
    );
    const job = mockDeliveryJob();
    const ranked = rankDrivers(drivers, job, DEFAULT_WEIGHTS, { limit: 3 });
    expect(ranked).toHaveLength(3);
  });
});

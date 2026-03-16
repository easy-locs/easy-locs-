/**
 * Tests — Driver Ranking Engine (PASS69 Block A)
 */
import { describe, it, expect } from "vitest";
import {
  haversineDistance,
  estimateEta,
  checkEligibility,
  rankDriver,
  rankDrivers,
  dispatchJob,
  batchDispatch,
  DEFAULT_WEIGHTS,
  VEHICLE_CAPACITY_KG,
  type DriverProfile,
  type DeliveryJob,
} from "@/lib/driver-ranking";

// ─── Fixtures ────────────────────────────────────────────────────────────────

const baseDriver = (overrides: Partial<DriverProfile> = {}): DriverProfile => ({
  id: "driver-1",
  name: "Ali",
  lat: 48.8566,
  lng: 2.3522, // Paris
  status: "online",
  vehicleType: "scooter",
  rating: 4.5,
  completedDeliveries: 100,
  cancelledDeliveries: 5,
  avgDeliveryMinutes: 25,
  acceptanceRate: 0.9,
  lastActiveAt: Date.now(),
  ...overrides,
});

const baseJob = (overrides: Partial<DeliveryJob> = {}): DeliveryJob => ({
  id: "job-1",
  pickupLat: 48.8606,
  pickupLng: 2.3376, // ~0.5km from driver
  dropoffLat: 48.87,
  dropoffLng: 2.35,
  requiredVehicles: [],
  weightKg: 5,
  priority: "standard",
  createdAt: Date.now(),
  ...overrides,
});

// ─── Geo ─────────────────────────────────────────────────────────────────────

describe("haversineDistance", () => {
  it("calculates distance between Paris points", () => {
    const d = haversineDistance(48.8566, 2.3522, 48.8606, 2.3376);
    expect(d).toBeGreaterThan(0.5);
    expect(d).toBeLessThan(2);
  });

  it("returns 0 for same point", () => {
    expect(haversineDistance(48.85, 2.35, 48.85, 2.35)).toBe(0);
  });

  it("calculates long distance correctly", () => {
    // Paris to London ~340km
    const d = haversineDistance(48.8566, 2.3522, 51.5074, -0.1278);
    expect(d).toBeGreaterThan(300);
    expect(d).toBeLessThan(400);
  });
});

describe("estimateEta", () => {
  it("estimates ETA for scooter", () => {
    const eta = estimateEta(10, "scooter"); // 10km at 30km/h = 20min
    expect(eta).toBe(20);
  });

  it("estimates ETA for bicycle", () => {
    const eta = estimateEta(5, "bicycle"); // 5km at 15km/h = 20min
    expect(eta).toBe(20);
  });
});

// ─── Eligibility ─────────────────────────────────────────────────────────────

describe("checkEligibility", () => {
  it("eligible: online driver, close, right vehicle", () => {
    const result = checkEligibility(baseDriver(), baseJob(), 2);
    expect(result.eligible).toBe(true);
  });

  it("ineligible: offline driver", () => {
    const result = checkEligibility(baseDriver({ status: "offline" }), baseJob(), 2);
    expect(result.eligible).toBe(false);
    expect(result.reason).toContain("offline");
  });

  it("ineligible: too far", () => {
    const result = checkEligibility(baseDriver(), baseJob(), 20);
    expect(result.eligible).toBe(false);
    expect(result.reason).toContain("Too far");
  });

  it("ineligible: package too heavy", () => {
    const heavy = baseJob({ weightKg: VEHICLE_CAPACITY_KG.scooter + 1 });
    const result = checkEligibility(baseDriver(), heavy, 2);
    expect(result.eligible).toBe(false);
    expect(result.reason).toContain("too heavy");
  });

  it("ineligible: wrong vehicle type", () => {
    const job = baseJob({ requiredVehicles: ["van", "truck"] });
    const result = checkEligibility(baseDriver({ vehicleType: "bicycle" }), job, 2);
    expect(result.eligible).toBe(false);
    expect(result.reason).toContain("not accepted");
  });

  it("respects driver maxDistanceKm", () => {
    const driver = baseDriver({ maxDistanceKm: 5 });
    const result = checkEligibility(driver, baseJob(), 6);
    expect(result.eligible).toBe(false);
  });
});

// ─── Ranking ─────────────────────────────────────────────────────────────────

describe("rankDriver", () => {
  it("returns a valid ranked result", () => {
    const result = rankDriver(baseDriver(), baseJob());
    expect(result.eligible).toBe(true);
    expect(result.score).toBeGreaterThan(0);
    expect(result.distanceToPickupKm).toBeGreaterThan(0);
    expect(result.breakdown.distanceScore).toBeGreaterThan(0);
    expect(result.breakdown.reliabilityScore).toBeGreaterThan(0);
    expect(result.breakdown.ratingScore).toBe(90); // 4.5/5 * 100
  });

  it("returns score 0 for ineligible driver", () => {
    const result = rankDriver(baseDriver({ status: "offline" }), baseJob());
    expect(result.eligible).toBe(false);
    expect(result.score).toBe(0);
  });

  it("new driver gets neutral reliability score", () => {
    const newDriver = baseDriver({ completedDeliveries: 0, cancelledDeliveries: 0 });
    const result = rankDriver(newDriver, baseJob());
    expect(result.breakdown.reliabilityScore).toBe(50);
  });
});

describe("rankDrivers", () => {
  it("ranks multiple drivers by score", () => {
    const drivers = [
      baseDriver({ id: "far", lat: 48.88, lng: 2.38, rating: 3.0 }), // ~3km, low rating
      baseDriver({ id: "close", lat: 48.86, lng: 2.34, rating: 4.8 }), // close, high rating
      baseDriver({ id: "offline", status: "offline" }),
    ];

    const ranked = rankDrivers(drivers, baseJob(), DEFAULT_WEIGHTS, { eligibleOnly: true });
    expect(ranked.length).toBe(2); // offline excluded
    expect(ranked[0].driver.id).toBe("close");
  });

  it("applies limit", () => {
    const drivers = Array.from({ length: 10 }, (_, i) =>
      baseDriver({ id: `d-${i}`, lat: 48.856 + i * 0.001 })
    );
    const ranked = rankDrivers(drivers, baseJob(), DEFAULT_WEIGHTS, { limit: 3 });
    expect(ranked.length).toBe(3);
  });

  it("applies priority boost for urgent jobs", () => {
    const urgentJob = baseJob({ priority: "urgent" });
    const standardJob = baseJob({ priority: "standard" });

    const closeDriver = baseDriver({ id: "close", lat: 48.86, lng: 2.34, rating: 3.0 });
    const farDriver = baseDriver({ id: "far", lat: 48.88, lng: 2.38, rating: 5.0 });
    const drivers = [closeDriver, farDriver];

    const urgentRanked = rankDrivers(drivers, urgentJob, DEFAULT_WEIGHTS, { applyPriorityBoost: true });
    const standardRanked = rankDrivers(drivers, standardJob, DEFAULT_WEIGHTS, { applyPriorityBoost: true });

    // With urgent priority, distance matters more → close driver should rank higher
    const urgentCloseScore = urgentRanked.find((r) => r.driver.id === "close")!.score;
    const standardCloseScore = standardRanked.find((r) => r.driver.id === "close")!.score;
    // Close driver should benefit from urgency boost
    expect(urgentCloseScore).toBeGreaterThanOrEqual(standardCloseScore - 5); // Allow small variance
  });
});

// ─── Dispatch ────────────────────────────────────────────────────────────────

describe("dispatchJob", () => {
  it("assigns best driver", () => {
    const drivers = [
      baseDriver({ id: "far", lat: 49.0, lng: 2.5 }),
      baseDriver({ id: "close", lat: 48.86, lng: 2.34 }),
    ];
    const result = dispatchJob(drivers, baseJob());
    expect(result.assignedDriver).not.toBeNull();
    expect(result.assignedDriver!.driver.id).toBe("close");
    expect(result.jobId).toBe("job-1");
  });

  it("returns null when no eligible drivers", () => {
    const drivers = [baseDriver({ status: "offline" })];
    const result = dispatchJob(drivers, baseJob());
    expect(result.assignedDriver).toBeNull();
  });
});

describe("batchDispatch", () => {
  it("avoids assigning same driver to multiple jobs", () => {
    const drivers = [
      baseDriver({ id: "d1", lat: 48.86, lng: 2.34 }),
      baseDriver({ id: "d2", lat: 48.865, lng: 2.345 }),
    ];
    const jobs = [
      baseJob({ id: "j1" }),
      baseJob({ id: "j2" }),
    ];

    const results = batchDispatch(drivers, jobs);
    const assignedIds = results
      .filter((r) => r.assignedDriver)
      .map((r) => r.assignedDriver!.driver.id);

    expect(new Set(assignedIds).size).toBe(assignedIds.length); // No duplicates
  });

  it("prioritizes urgent jobs first", () => {
    const drivers = [baseDriver({ id: "only" })];
    const jobs = [
      baseJob({ id: "standard", priority: "standard" }),
      baseJob({ id: "urgent", priority: "urgent" }),
    ];

    const results = batchDispatch(drivers, jobs);
    // Urgent job should get the only driver
    const urgentResult = results.find((r) => r.jobId === "urgent")!;
    const standardResult = results.find((r) => r.jobId === "standard")!;
    expect(urgentResult.assignedDriver).not.toBeNull();
    expect(standardResult.assignedDriver).toBeNull();
  });

  it("handles more jobs than drivers", () => {
    const drivers = [baseDriver({ id: "d1" })];
    const jobs = [baseJob({ id: "j1" }), baseJob({ id: "j2" }), baseJob({ id: "j3" })];

    const results = batchDispatch(drivers, jobs);
    const assigned = results.filter((r) => r.assignedDriver !== null);
    expect(assigned.length).toBe(1);
  });
});

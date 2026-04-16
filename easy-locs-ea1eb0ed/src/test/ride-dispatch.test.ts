import { describe, it, expect } from "vitest";
import {
  rankDrivers,
  planDispatch,
  haversineKm,
  DEFAULT_WEIGHTS,
  type DispatchDriver,
} from "@/domains/ride/dispatch";

const pickup = { lat: 25.2048, lng: 55.2708 };

function driver(overrides: Partial<DispatchDriver>): DispatchDriver {
  return {
    userId: "u",
    lat: 25.2,
    lng: 55.27,
    ratingAvg: 4.8,
    acceptanceRate: 90,
    completedRides: 500,
    activeJobs: 0,
    vehicleType: "economy",
    isAvailable: true,
    lastPingAgoSec: 5,
    ...overrides,
  };
}

describe("ride/dispatch", () => {
  it("haversine returns ~0 for identical points", () => {
    expect(haversineKm(10, 20, 10, 20)).toBeCloseTo(0, 3);
  });

  it("haversine is symmetric", () => {
    expect(haversineKm(10, 20, 11, 21)).toBeCloseTo(haversineKm(11, 21, 10, 20), 5);
  });

  it("skips unavailable drivers", () => {
    const ranked = rankDrivers(
      [driver({ userId: "a" }), driver({ userId: "b", isAvailable: false })],
      { pickup },
    );
    expect(ranked.map((r) => r.userId)).toEqual(["a"]);
  });

  it("excludes drivers outside radius", () => {
    const ranked = rankDrivers(
      [
        driver({ userId: "near", lat: 25.21, lng: 55.27 }),
        driver({ userId: "far", lat: 26.5, lng: 56.5 }),
      ],
      { pickup, maxRadiusKm: 5 },
    );
    expect(ranked.map((r) => r.userId)).toEqual(["near"]);
  });

  it("prefers closer, higher-rated, low-load drivers", () => {
    const ranked = rankDrivers(
      [
        driver({ userId: "best", lat: 25.206, lng: 55.272, ratingAvg: 4.95, activeJobs: 0 }),
        driver({ userId: "mid", lat: 25.23, lng: 55.29, ratingAvg: 4.4, activeJobs: 1 }),
        driver({ userId: "worst", lat: 25.25, lng: 55.3, ratingAvg: 3.6, activeJobs: 3 }),
      ],
      { pickup, maxRadiusKm: 20 },
    );
    expect(ranked[0].userId).toBe("best");
    expect(ranked[ranked.length - 1].userId).toBe("worst");
  });

  it("vehicle fit boosts exact match over mismatch", () => {
    const ranked = rankDrivers(
      [
        driver({ userId: "match", vehicleType: "premium" }),
        driver({ userId: "miss", vehicleType: "economy" }),
      ],
      { pickup, vehicleType: "premium" },
    );
    expect(ranked[0].userId).toBe("match");
  });

  it("assigns monotonically increasing rank", () => {
    const drivers = [
      driver({ userId: "a", lat: 25.21, lng: 55.27 }),
      driver({ userId: "b", lat: 25.22, lng: 55.28 }),
      driver({ userId: "c", lat: 25.25, lng: 55.3 }),
    ];
    const ranked = rankDrivers(drivers, { pickup });
    ranked.forEach((r, i) => expect(r.rank).toBe(i + 1));
  });

  it("weights sum to 1.0", () => {
    const sum = Object.values(DEFAULT_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1.0, 5);
  });

  it("planDispatch produces waves with staggered offsets", () => {
    const drivers = Array.from({ length: 10 }, (_, i) =>
      driver({ userId: `d${i}`, lat: 25.2 + i * 0.001, lng: 55.27 }),
    );
    const plan = planDispatch(drivers, { pickup }, { waveSize: 3, waveIntervalMs: 2000, maxWaves: 3 });
    expect(plan.waves.length).toBeGreaterThan(0);
    expect(plan.waves.length).toBeLessThanOrEqual(3);
    plan.waves.forEach((w, i) => expect(w.offerAtMs).toBe(i * 2000));
  });

  it("handles empty driver pool", () => {
    expect(rankDrivers([], { pickup })).toEqual([]);
    expect(planDispatch([], { pickup }).candidates).toEqual([]);
  });

  it("ranks a large pool of drivers without errors (performance smoke)", () => {
    const pool = Array.from({ length: 300 }, (_, i) =>
      driver({
        userId: `d${i}`,
        lat: 25.2 + Math.random() * 0.05,
        lng: 55.27 + Math.random() * 0.05,
        ratingAvg: 4 + Math.random(),
        acceptanceRate: 40 + Math.random() * 60,
      }),
    );
    const ranked = rankDrivers(pool, { pickup });
    expect(ranked.length).toBeGreaterThan(0);
    expect(ranked[0].score).toBeGreaterThanOrEqual(ranked[ranked.length - 1].score);
  });
});

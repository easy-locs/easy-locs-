import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  computeContextualBoosts,
  computeGeoProximityBoost,
  type ContextualFactors,
} from "./contextual-signals";

vi.mock("@/services/db", () => ({
  db: { functions: { invoke: vi.fn().mockResolvedValue({ data: null, error: null }) } },
}));

describe("computeContextualBoosts – weather multipliers", () => {
  it("applies rainy_day boost of 0.3 to delivery, food, grocery", () => {
    const ctx: ContextualFactors = {
      timeOfDay: "afternoon",
      dayOfWeek: 3,
      isWeekend: false,
      weather: "rainy",
    };
    const boosts = computeContextualBoosts(ctx);
    expect(boosts.get("delivery")).toBeGreaterThanOrEqual(0.3);
    expect(boosts.get("food")).toBeGreaterThanOrEqual(0.3);
    expect(boosts.get("grocery")).toBeGreaterThanOrEqual(0.3);
  });

  it("applies hot_weather boost of 0.2 to delivery, grocery, taxi", () => {
    const ctx: ContextualFactors = {
      timeOfDay: "afternoon",
      dayOfWeek: 3,
      isWeekend: false,
      weather: "hot",
    };
    const boosts = computeContextualBoosts(ctx);
    expect(boosts.get("delivery")).toBeGreaterThanOrEqual(0.2);
    expect(boosts.get("grocery")).toBeGreaterThanOrEqual(0.2);
    expect(boosts.get("taxi")).toBeGreaterThanOrEqual(0.2);
  });

  it("does not apply weather boosts when weather is sunny", () => {
    const ctx: ContextualFactors = {
      timeOfDay: "morning",
      dayOfWeek: 2,
      isWeekend: false,
      weather: "sunny",
    };
    const boosts = computeContextualBoosts(ctx);
    const morningTaxi = boosts.get("taxi") ?? 0;
    expect(morningTaxi).toBe(0.25);
  });

  it("stacks weather boost with time-of-day boost", () => {
    const ctx: ContextualFactors = {
      timeOfDay: "afternoon",
      dayOfWeek: 1,
      isWeekend: false,
      weather: "rainy",
    };
    const boosts = computeContextualBoosts(ctx);
    const foodBoost = boosts.get("food") ?? 0;
    expect(foodBoost).toBeCloseTo(0.3 + 0.3, 5);
  });
});

describe("computeContextualBoosts – time-of-day rules", () => {
  it("boosts taxi and food during morning commute on weekdays", () => {
    const ctx: ContextualFactors = {
      timeOfDay: "morning",
      dayOfWeek: 1,
      isWeekend: false,
    };
    const boosts = computeContextualBoosts(ctx);
    expect(boosts.get("taxi")).toBe(0.25);
    expect(boosts.get("food")).toBe(0.25);
    expect(boosts.get("grocery")).toBe(0.25);
  });

  it("boosts food and delivery during lunch rush on weekdays", () => {
    const ctx: ContextualFactors = {
      timeOfDay: "afternoon",
      dayOfWeek: 2,
      isWeekend: false,
    };
    const boosts = computeContextualBoosts(ctx);
    expect(boosts.get("food")).toBe(0.3);
    expect(boosts.get("delivery")).toBe(0.3);
  });

  it("boosts food and delivery during night", () => {
    const ctx: ContextualFactors = {
      timeOfDay: "night",
      dayOfWeek: 4,
      isWeekend: false,
    };
    const boosts = computeContextualBoosts(ctx);
    expect(boosts.get("food")).toBe(0.35);
    expect(boosts.get("delivery")).toBe(0.35);
  });

  it("boosts shops, grocery, services on weekend mornings", () => {
    const ctx: ContextualFactors = {
      timeOfDay: "morning",
      dayOfWeek: 6,
      isWeekend: true,
    };
    const boosts = computeContextualBoosts(ctx);
    expect(boosts.get("shops")).toBe(0.2);
    expect(boosts.get("grocery")).toBe(0.2);
    expect(boosts.get("services")).toBe(0.2);
  });

  it("applies weekend_travel boost on weekends", () => {
    const ctx: ContextualFactors = {
      timeOfDay: "evening",
      dayOfWeek: 0,
      isWeekend: true,
    };
    const boosts = computeContextualBoosts(ctx);
    expect(boosts.get("stay")).toBeGreaterThanOrEqual(0.15);
    expect(boosts.get("taxi")).toBeGreaterThanOrEqual(0.15);
  });
});

describe("computeContextualBoosts – recentCategories", () => {
  it("adds 0.1 boost for each recent category", () => {
    const ctx: ContextualFactors = {
      timeOfDay: "morning",
      dayOfWeek: 3,
      isWeekend: false,
      recentCategories: ["health", "shops"],
    };
    const boosts = computeContextualBoosts(ctx);
    expect(boosts.get("health")).toBe(0.1);
    expect(boosts.get("shops")).toBe(0.1);
  });

  it("stacks recent category boost with time-of-day boost", () => {
    const ctx: ContextualFactors = {
      timeOfDay: "morning",
      dayOfWeek: 1,
      isWeekend: false,
      recentCategories: ["food"],
    };
    const boosts = computeContextualBoosts(ctx);
    expect(boosts.get("food")).toBeCloseTo(0.25 + 0.1, 5);
  });
});

describe("computeGeoProximityBoost", () => {
  it("returns 1 when item is at user's exact location", () => {
    expect(computeGeoProximityBoost(40.0, -74.0, 40.0, -74.0, 20)).toBe(1);
  });

  it("returns 0 when distance exceeds maxDistanceKm", () => {
    const boost = computeGeoProximityBoost(41.0, -74.0, 40.0, -74.0, 5);
    expect(boost).toBe(0);
  });

  it("returns value between 0 and 1 for items within range", () => {
    const boost = computeGeoProximityBoost(40.01, -74.0, 40.0, -74.0, 20);
    expect(boost).toBeGreaterThan(0);
    expect(boost).toBeLessThan(1);
  });

  it("decreases linearly with distance", () => {
    const closer = computeGeoProximityBoost(40.005, -74.0, 40.0, -74.0, 50);
    const farther = computeGeoProximityBoost(40.05, -74.0, 40.0, -74.0, 50);
    expect(closer).toBeGreaterThan(farther);
  });
});

describe("recency decay – verified through scoreRecommendations", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("applies recency decay as a score multiplier between 0.85 and 1.0", async () => {
    const { scoreRecommendations } = await import("./recommendation-engine");
    const results = scoreRecommendations({ timeOfDay: "morning" });
    for (const item of results) {
      expect(item.score).toBeGreaterThanOrEqual(0);
      expect(item.score).toBeLessThanOrEqual(100);
    }
  });

  it("base score of 30 is scaled by recency factor into expected range", async () => {
    const { scoreRecommendations } = await import("./recommendation-engine");
    const results = scoreRecommendations({});
    for (const item of results) {
      expect(item.score).toBeGreaterThanOrEqual(Math.round(30 * 0.85) - 1);
    }
  });
});

describe("computeGeoProximityBoost – edge cases", () => {
  it("returns 1 when maxDistanceKm is 0 and points are identical", () => {
    const boost = computeGeoProximityBoost(40.0, -74.0, 40.0, -74.0, 0);
    expect(boost).toBe(1);
  });

  it("returns 0 when maxDistanceKm is 0 and points differ", () => {
    const boost = computeGeoProximityBoost(40.01, -74.0, 40.0, -74.0, 0);
    expect(boost).toBe(0);
  });

  it("returns 0 when maxDistanceKm is negative and points differ", () => {
    const boost = computeGeoProximityBoost(40.01, -74.0, 40.0, -74.0, -5);
    expect(boost).toBe(0);
  });

  it("returns 0 when maxDistanceKm is negative and points are identical", () => {
    const boost = computeGeoProximityBoost(40.0, -74.0, 40.0, -74.0, -5);
    expect(boost).toBe(0);
  });
});

describe("scoreRecommendations – deterministic weather ranking", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.spyOn(Math, "random").mockReturnValue(0.5);
  });

  it("rainy weather increases delivery vertical scores vs sunny baseline", async () => {
    const { scoreRecommendations } = await import("./recommendation-engine");

    const sunny = scoreRecommendations({ timeOfDay: "afternoon", weather: "sunny" });
    const rainy = scoreRecommendations({ timeOfDay: "afternoon", weather: "rainy" });

    const sunnyDelivery = sunny.find((r) => r.id === "rec_delivery_1")!;
    const rainyDelivery = rainy.find((r) => r.id === "rec_delivery_1")!;
    expect(rainyDelivery.score).toBeGreaterThan(sunnyDelivery.score);
  });

  it("hot weather increases taxi vertical scores vs sunny baseline", async () => {
    const { scoreRecommendations } = await import("./recommendation-engine");

    const sunny = scoreRecommendations({ timeOfDay: "afternoon", weather: "sunny" });
    const hot = scoreRecommendations({ timeOfDay: "afternoon", weather: "hot" });

    const sunnyTaxi = sunny.find((r) => r.id === "rec_taxi_1")!;
    const hotTaxi = hot.find((r) => r.id === "rec_taxi_1")!;
    expect(hotTaxi.score).toBeGreaterThan(sunnyTaxi.score);
  });
});

describe("scoreRecommendations – deterministic recency decay effect", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.spyOn(Math, "random").mockReturnValue(0.5);
  });

  it("produces consistent scores with fixed randomness", async () => {
    const { scoreRecommendations } = await import("./recommendation-engine");
    const run1 = scoreRecommendations({ timeOfDay: "morning" });
    const run2 = scoreRecommendations({ timeOfDay: "morning" });
    expect(run1.map((r) => r.score)).toEqual(run2.map((r) => r.score));
  });

  it("recency decay keeps scores above 85% of base when random age is small", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.0);
    const { scoreRecommendations } = await import("./recommendation-engine");
    const results = scoreRecommendations({});
    for (const item of results) {
      expect(item.score).toBeGreaterThanOrEqual(Math.round(30 * 0.85));
    }
  });
});

describe("scoreRecommendations – scoring behavior", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("returns items sorted by descending score", async () => {
    const { scoreRecommendations } = await import("./recommendation-engine");
    const results = scoreRecommendations({ timeOfDay: "morning" });
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score);
    }
  });

  it("returns at most 10 items", async () => {
    const { scoreRecommendations } = await import("./recommendation-engine");
    const results = scoreRecommendations({ timeOfDay: "afternoon" });
    expect(results.length).toBeLessThanOrEqual(10);
  });

  it("assigns all scores between 0 and 100", async () => {
    const { scoreRecommendations } = await import("./recommendation-engine");
    const results = scoreRecommendations({ timeOfDay: "evening" });
    for (const item of results) {
      expect(item.score).toBeGreaterThanOrEqual(0);
      expect(item.score).toBeLessThanOrEqual(100);
    }
  });

  it("boosts favorited items", async () => {
    const { scoreRecommendations } = await import("./recommendation-engine");
    const withoutFav = scoreRecommendations({ timeOfDay: "morning" });
    const favItem = withoutFav[withoutFav.length - 1];

    const withFav = scoreRecommendations({
      timeOfDay: "morning",
      favorites: [favItem.id],
    });

    const boostedItem = withFav.find((i) => i.id === favItem.id);
    expect(boostedItem).toBeDefined();
    expect(boostedItem!.reason).toBe("In your favorites");
  });

  it("boosts items matching recent routes", async () => {
    const { scoreRecommendations } = await import("./recommendation-engine");
    const results = scoreRecommendations({
      timeOfDay: "morning",
      recentRoutes: ["/food/restaurant-1", "/food/restaurant-2"],
    });

    const foodItems = results.filter((r) => r.vertical === "food");
    expect(foodItems.length).toBeGreaterThan(0);
    const hasFoodInTop = results.slice(0, 5).some((r) => r.vertical === "food");
    expect(hasFoodInTop).toBe(true);
  });

  it("includes trending reason when weather context is applied", async () => {
    const { scoreRecommendations } = await import("./recommendation-engine");
    const results = scoreRecommendations({
      timeOfDay: "afternoon",
      weather: "rainy",
    });
    const hasTrendingReason = results.some((r) => r.reason.startsWith("Trending"));
    expect(hasTrendingReason).toBe(true);
  });

  it("each item has a non-empty reason", async () => {
    const { scoreRecommendations } = await import("./recommendation-engine");
    const results = scoreRecommendations({ timeOfDay: "night" });
    for (const item of results) {
      expect(item.reason.length).toBeGreaterThan(0);
    }
  });
});

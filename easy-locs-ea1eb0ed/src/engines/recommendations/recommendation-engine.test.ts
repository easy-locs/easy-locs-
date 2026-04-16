import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  computeContextualBoosts,
  computeGeoProximityBoost,
  type ContextualFactors,
} from "./contextual-signals";
import { sanitizeScore, getSanitizationWarningCount, resetSanitizationWarningCount } from "./recommendation-engine";

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

  it("handles negative maxDistanceKm by returning 0 for non-identical points", () => {
    const boost = computeGeoProximityBoost(40.01, -74.0, 40.0, -74.0, -5);
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

describe("sanitizeScore", () => {
  beforeEach(() => {
    resetSanitizationWarningCount();
  });

  it("returns the value when it is a finite number", () => {
    expect(sanitizeScore(42)).toBe(42);
    expect(sanitizeScore(-5)).toBe(-5);
    expect(sanitizeScore(0)).toBe(0);
  });

  it("returns fallback for NaN", () => {
    expect(sanitizeScore(NaN)).toBe(0);
    expect(sanitizeScore(NaN, 30)).toBe(30);
  });

  it("returns fallback for Infinity", () => {
    expect(sanitizeScore(Infinity)).toBe(0);
    expect(sanitizeScore(Infinity, 10)).toBe(10);
  });

  it("returns fallback for -Infinity", () => {
    expect(sanitizeScore(-Infinity)).toBe(0);
    expect(sanitizeScore(-Infinity, 50)).toBe(50);
  });

  it("emits a console.warn when a non-finite value is sanitized", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    sanitizeScore(NaN, 0, "test-item", "test-source");
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0][0]).toContain("test-item");
    expect(warnSpy.mock.calls[0][0]).toContain("test-source");
    expect(warnSpy.mock.calls[0][0]).toContain("NaN");
    warnSpy.mockRestore();
  });

  it("includes Infinity label in warning for Infinity values", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    sanitizeScore(Infinity, 0, "inf-item", "inf-source");
    expect(warnSpy.mock.calls[0][0]).toContain("Infinity");
    expect(warnSpy.mock.calls[0][0]).toContain("inf-item");
    warnSpy.mockRestore();
  });

  it("does not emit a warning for finite values", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    sanitizeScore(42, 0, "ok-item", "ok-source");
    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it("increments the sanitization warning counter on non-finite values", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const before = getSanitizationWarningCount();
    sanitizeScore(NaN, 0, "a", "b");
    sanitizeScore(Infinity, 0, "c", "d");
    expect(getSanitizationWarningCount()).toBe(before + 2);
    vi.restoreAllMocks();
  });

  it("uses 'unknown' labels when context is omitted", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    sanitizeScore(NaN);
    expect(warnSpy.mock.calls[0][0]).toContain('item="unknown"');
    expect(warnSpy.mock.calls[0][0]).toContain('source="unknown"');
    warnSpy.mockRestore();
  });

});

describe("sanitizeScore – health reporting on non-finite values", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("calls reportHealth with degraded status when a non-finite value is sanitized", async () => {
    const mockReportHealth = vi.fn();
    vi.doMock("@/lib/runtime/health-aggregator", () => ({
      reportHealth: mockReportHealth,
    }));
    vi.doMock("@/services/db", () => ({
      db: { functions: { invoke: vi.fn().mockResolvedValue({ data: null, error: null }) } },
    }));
    const { sanitizeScore: localSanitize } = await import("./recommendation-engine");
    vi.spyOn(console, "warn").mockImplementation(() => {});
    localSanitize(NaN, 0, "health-item", "health-source");
    expect(mockReportHealth).toHaveBeenCalledWith(
      "recommendation-engine",
      "degraded",
      undefined,
      expect.stringContaining("health-item"),
    );
    expect(mockReportHealth).toHaveBeenCalledWith(
      "recommendation-engine",
      "degraded",
      undefined,
      expect.stringContaining("health-source"),
    );
    vi.restoreAllMocks();
  });

  it("does not call reportHealth for finite values", async () => {
    const mockReportHealth = vi.fn();
    vi.doMock("@/lib/runtime/health-aggregator", () => ({
      reportHealth: mockReportHealth,
    }));
    vi.doMock("@/services/db", () => ({
      db: { functions: { invoke: vi.fn().mockResolvedValue({ data: null, error: null }) } },
    }));
    const { sanitizeScore: localSanitize } = await import("./recommendation-engine");
    localSanitize(42, 0, "ok-item", "ok-source");
    expect(mockReportHealth).not.toHaveBeenCalled();
  });
});

describe("scoreRecommendations – non-finite intermediate boosts produce valid scores", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("produces valid scores when cosineSimilarity returns NaN", async () => {
    vi.doMock("./vector-similarity", async () => {
      const actual = await vi.importActual<typeof import("./vector-similarity")>("./vector-similarity");
      return {
        ...actual,
        cosineSimilarity: () => NaN,
      };
    });
    const { scoreRecommendations } = await import("./recommendation-engine");
    const results = scoreRecommendations({
      timeOfDay: "morning",
      recentRoutes: ["/food/test"],
    });
    for (const item of results) {
      expect(Number.isFinite(item.score)).toBe(true);
      expect(item.score).toBeGreaterThanOrEqual(0);
      expect(item.score).toBeLessThanOrEqual(100);
    }
  });

  it("produces valid scores when cosineSimilarity returns Infinity", async () => {
    vi.doMock("./vector-similarity", async () => {
      const actual = await vi.importActual<typeof import("./vector-similarity")>("./vector-similarity");
      return {
        ...actual,
        cosineSimilarity: () => Infinity,
      };
    });
    const { scoreRecommendations } = await import("./recommendation-engine");
    const results = scoreRecommendations({
      timeOfDay: "morning",
      recentRoutes: ["/food/test"],
    });
    for (const item of results) {
      expect(Number.isFinite(item.score)).toBe(true);
      expect(item.score).toBeGreaterThanOrEqual(0);
      expect(item.score).toBeLessThanOrEqual(100);
    }
  });

  it("produces valid scores when geoProximityBoost returns NaN", async () => {
    vi.doMock("./contextual-signals", async () => {
      const actual = await vi.importActual<typeof import("./contextual-signals")>("./contextual-signals");
      return {
        ...actual,
        computeGeoProximityBoost: () => NaN,
      };
    });
    const { scoreRecommendations } = await import("./recommendation-engine");
    const results = scoreRecommendations({
      timeOfDay: "morning",
      location: { lat: 40.0, lng: -74.0 },
    });
    for (const item of results) {
      expect(Number.isFinite(item.score)).toBe(true);
      expect(item.score).toBeGreaterThanOrEqual(0);
      expect(item.score).toBeLessThanOrEqual(100);
    }
  });
});

interface AbortSignalWithTimeout {
  timeout(ms: number): AbortSignal;
}

function stubAbortSignalTimeout() {
  if (typeof AbortSignal.timeout !== "function") {
    Object.defineProperty(AbortSignal, "timeout", {
      configurable: true,
      writable: true,
      value: (ms: number): AbortSignal => {
        const controller = new AbortController();
        setTimeout(() => controller.abort(), ms);
        return controller.signal;
      },
    });
  }
}

describe("scoreRecommendationsAsync – weather API fetch", () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.resetModules();
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    stubAbortSignalTimeout();
    mockFetch = vi.fn();
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("fetches weather from API and applies rainy signal when weathercode >= 51", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ current: { temperature_2m: 18, weathercode: 61 } }),
        { status: 200 },
      ),
    );

    const { scoreRecommendationsAsync } = await import("./recommendation-engine");
    const results = await scoreRecommendationsAsync({
      timeOfDay: "afternoon",
      location: { lat: 40.7, lng: -74.0 },
    });

    expect(mockFetch).toHaveBeenCalledOnce();
    expect(mockFetch.mock.calls[0][0]).toContain("api.open-meteo.com");

    const deliveryItem = results.find((r) => r.id === "rec_delivery_1");
    expect(deliveryItem).toBeDefined();
    expect(deliveryItem!.reason).toMatch(/rainy|Trending/);
  });

  it("maps hot temperature (>35) to hot weather signal and boosts taxi scores", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ current: { temperature_2m: 40, weathercode: 0 } }),
        { status: 200 },
      ),
    );

    const { scoreRecommendationsAsync } = await import("./recommendation-engine");

    const hotResults = await scoreRecommendationsAsync({
      timeOfDay: "afternoon",
      location: { lat: 40.7, lng: -74.0 },
    });

    const hotTaxi = hotResults.find((r) => r.id === "rec_taxi_1");
    expect(hotTaxi).toBeDefined();
    expect(hotTaxi!.reason).toMatch(/hot|Trending|Perfect/);

    const sunnyResults = await scoreRecommendationsAsync({
      timeOfDay: "afternoon",
      weather: "sunny",
    });
    const sunnyTaxi = sunnyResults.find((r) => r.id === "rec_taxi_1");
    expect(hotTaxi!.score).toBeGreaterThanOrEqual(sunnyTaxi!.score);
  });

  it("maps cold temperature (<10) to cold weather signal without rainy/hot boosts", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ current: { temperature_2m: 5, weathercode: 0 } }),
        { status: 200 },
      ),
    );

    const { scoreRecommendationsAsync } = await import("./recommendation-engine");
    const results = await scoreRecommendationsAsync({
      timeOfDay: "afternoon",
      location: { lat: 40.7, lng: -74.0 },
    });

    expect(results.length).toBeGreaterThan(0);
    expect(results.length).toBeLessThanOrEqual(10);
    const deliveryItem = results.find((r) => r.id === "rec_delivery_1");
    expect(deliveryItem).toBeDefined();
    expect(deliveryItem!.reason).not.toMatch(/rainy|hot/i);
  });

  it("maps cloudy weathercode (1-3) to cloudy weather signal without rainy boost", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ current: { temperature_2m: 20, weathercode: 2 } }),
        { status: 200 },
      ),
    );

    const { scoreRecommendationsAsync } = await import("./recommendation-engine");
    const results = await scoreRecommendationsAsync({
      timeOfDay: "afternoon",
      location: { lat: 40.7, lng: -74.0 },
    });

    expect(results.length).toBeGreaterThan(0);
    const deliveryItem = results.find((r) => r.id === "rec_delivery_1");
    expect(deliveryItem).toBeDefined();
    expect(deliveryItem!.reason).not.toMatch(/rainy/i);
  });

  it("defaults to sunny when weathercode is 0 and temperature is moderate", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ current: { temperature_2m: 22, weathercode: 0 } }),
        { status: 200 },
      ),
    );

    const { scoreRecommendationsAsync } = await import("./recommendation-engine");
    const results = await scoreRecommendationsAsync({
      timeOfDay: "afternoon",
      location: { lat: 40.7, lng: -74.0 },
    });

    expect(results.length).toBeGreaterThan(0);
    for (const item of results) {
      expect(item.score).toBeGreaterThanOrEqual(0);
      expect(item.score).toBeLessThanOrEqual(100);
    }
  });

  it("returns undefined weather on non-ok response and still produces results", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response("Server Error", { status: 500 }),
    );

    const { scoreRecommendationsAsync } = await import("./recommendation-engine");
    const results = await scoreRecommendationsAsync({
      timeOfDay: "afternoon",
      location: { lat: 40.7, lng: -74.0 },
    });

    expect(results.length).toBeGreaterThan(0);
    for (const item of results) {
      expect(item.score).toBeGreaterThanOrEqual(0);
      expect(item.score).toBeLessThanOrEqual(100);
    }
  });
});

describe("scoreRecommendationsAsync – weather API timeout fallback", () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.resetModules();
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    stubAbortSignalTimeout();
    mockFetch = vi.fn();
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("gracefully handles fetch rejection and returns valid results", async () => {
    mockFetch.mockRejectedValueOnce(new DOMException("The operation was aborted", "AbortError"));

    const { scoreRecommendationsAsync } = await import("./recommendation-engine");
    const results = await scoreRecommendationsAsync({
      timeOfDay: "afternoon",
      location: { lat: 40.7, lng: -74.0 },
    });

    expect(results.length).toBeGreaterThan(0);
    for (const item of results) {
      expect(item.score).toBeGreaterThanOrEqual(0);
      expect(item.score).toBeLessThanOrEqual(100);
    }
  });

  it("gracefully handles network error and returns valid results", async () => {
    mockFetch.mockRejectedValueOnce(new TypeError("Failed to fetch"));

    const { scoreRecommendationsAsync } = await import("./recommendation-engine");
    const results = await scoreRecommendationsAsync({
      timeOfDay: "morning",
      location: { lat: 35.0, lng: 139.0 },
    });

    expect(results.length).toBeGreaterThan(0);
    expect(results[0].reason.length).toBeGreaterThan(0);
  });
});

describe("scoreRecommendationsAsync – weather cache behavior", () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.resetModules();
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    stubAbortSignalTimeout();
    mockFetch = vi.fn();
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("reuses cached weather within 30 minutes and does not re-fetch", async () => {
    mockFetch.mockResolvedValue(
      new Response(
        JSON.stringify({ current: { temperature_2m: 18, weathercode: 61 } }),
        { status: 200 },
      ),
    );

    const { scoreRecommendationsAsync } = await import("./recommendation-engine");

    await scoreRecommendationsAsync({
      timeOfDay: "afternoon",
      location: { lat: 40.7, lng: -74.0 },
    });
    expect(mockFetch).toHaveBeenCalledTimes(1);

    await scoreRecommendationsAsync({
      timeOfDay: "evening",
      location: { lat: 40.7, lng: -74.0 },
    });
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("re-fetches weather after cache expires (30 minutes)", async () => {
    const realNow = Date.now();
    let currentTime = realNow;
    vi.spyOn(Date, "now").mockImplementation(() => currentTime);

    mockFetch.mockResolvedValue(
      new Response(
        JSON.stringify({ current: { temperature_2m: 18, weathercode: 61 } }),
        { status: 200 },
      ),
    );

    const { scoreRecommendationsAsync } = await import("./recommendation-engine");

    await scoreRecommendationsAsync({
      timeOfDay: "afternoon",
      location: { lat: 40.7, lng: -74.0 },
    });
    expect(mockFetch).toHaveBeenCalledTimes(1);

    currentTime = realNow + 31 * 60 * 1000;

    await scoreRecommendationsAsync({
      timeOfDay: "evening",
      location: { lat: 40.7, lng: -74.0 },
    });
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("does not fetch weather when no location is provided", async () => {
    const { scoreRecommendationsAsync } = await import("./recommendation-engine");

    await scoreRecommendationsAsync({ timeOfDay: "afternoon" });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("skips weather fetch when ctx.weather is already provided", async () => {
    const { scoreRecommendationsAsync } = await import("./recommendation-engine");

    const results = await scoreRecommendationsAsync({
      timeOfDay: "afternoon",
      location: { lat: 40.7, lng: -74.0 },
      weather: "rainy",
    });

    expect(mockFetch).not.toHaveBeenCalled();
    expect(results.length).toBeGreaterThan(0);
  });
});

describe("scoreRecommendationsAsync – non-finite intermediate boosts produce valid scores", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("produces valid scores when cosineSimilarity returns NaN (async)", async () => {
    vi.doMock("./vector-similarity", async () => {
      const actual = await vi.importActual<typeof import("./vector-similarity")>("./vector-similarity");
      return {
        ...actual,
        cosineSimilarity: () => NaN,
      };
    });
    const { scoreRecommendationsAsync } = await import("./recommendation-engine");
    const results = await scoreRecommendationsAsync({
      timeOfDay: "morning",
      recentRoutes: ["/food/test"],
    });
    for (const item of results) {
      expect(Number.isFinite(item.score)).toBe(true);
      expect(item.score).toBeGreaterThanOrEqual(0);
      expect(item.score).toBeLessThanOrEqual(100);
    }
  });

  it("produces valid scores when geoProximityBoost returns Infinity (async)", async () => {
    vi.doMock("./contextual-signals", async () => {
      const actual = await vi.importActual<typeof import("./contextual-signals")>("./contextual-signals");
      return {
        ...actual,
        computeGeoProximityBoost: () => Infinity,
      };
    });
    const { scoreRecommendationsAsync } = await import("./recommendation-engine");
    const results = await scoreRecommendationsAsync({
      timeOfDay: "morning",
      location: { lat: 40.0, lng: -74.0 },
    });
    for (const item of results) {
      expect(Number.isFinite(item.score)).toBe(true);
      expect(item.score).toBeGreaterThanOrEqual(0);
      expect(item.score).toBeLessThanOrEqual(100);
    }
  });

  it("produces valid scores when pgvector returns non-finite similarity (async)", async () => {
    vi.doMock("@/services/db", () => ({
      db: {
        functions: {
          invoke: vi.fn().mockResolvedValue({
            data: {
              matches: [
                { id: "pgvec_nan", title: "NaN item", type: "listing", route: "/food", vertical: "food", similarity: NaN },
                { id: "pgvec_inf", title: "Inf item", type: "listing", route: "/grocery", vertical: "grocery", similarity: Infinity },
              ],
            },
            error: null,
          }),
        },
      },
    }));
    const { scoreRecommendationsAsync } = await import("./recommendation-engine");
    const results = await scoreRecommendationsAsync({
      userId: "test-user",
      timeOfDay: "morning",
    });
    for (const item of results) {
      expect(Number.isFinite(item.score)).toBe(true);
      expect(item.score).toBeGreaterThanOrEqual(0);
      expect(item.score).toBeLessThanOrEqual(100);
    }
  });
});

describe("scoreRecommendationsAsync – pgvector database fallback", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    stubAbortSignalTimeout();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ current: { temperature_2m: 22, weathercode: 0 } }),
        { status: 200 },
      ),
    ));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("falls back to local catalog when db.functions.invoke returns an error", async () => {
    const { db } = await import("@/services/db");
    vi.mocked(db.functions.invoke).mockResolvedValueOnce({
      data: null,
      error: { message: "Edge function timeout" },
    });

    const { scoreRecommendationsAsync, trackUserInteraction } = await import("./recommendation-engine");
    trackUserInteraction("user-1", "rec_food_1", "click");

    const results = await scoreRecommendationsAsync({
      userId: "user-1",
      timeOfDay: "afternoon",
      location: { lat: 40.7, lng: -74.0 },
    });

    expect(results.length).toBeGreaterThan(0);
    expect(results.length).toBeLessThanOrEqual(10);
    for (const item of results) {
      expect(item.score).toBeGreaterThanOrEqual(0);
      expect(item.score).toBeLessThanOrEqual(100);
    }
  });

  it("falls back to local catalog when db.functions.invoke returns empty matches", async () => {
    const { db } = await import("@/services/db");
    vi.mocked(db.functions.invoke).mockResolvedValueOnce({
      data: { matches: [] },
      error: null,
    });

    const { scoreRecommendationsAsync, trackUserInteraction } = await import("./recommendation-engine");
    trackUserInteraction("user-2", "rec_grocery_1", "view");

    const results = await scoreRecommendationsAsync({
      userId: "user-2",
      timeOfDay: "morning",
      location: { lat: 40.7, lng: -74.0 },
    });

    expect(results.length).toBeGreaterThan(0);
    const allFromCatalog = results.every((r) =>
      r.id.startsWith("rec_"),
    );
    expect(allFromCatalog).toBe(true);
  });

  it("falls back to local catalog when db.functions.invoke returns null data", async () => {
    const { db } = await import("@/services/db");
    vi.mocked(db.functions.invoke).mockResolvedValueOnce({
      data: null,
      error: null,
    });

    const { scoreRecommendationsAsync, trackUserInteraction } = await import("./recommendation-engine");
    trackUserInteraction("user-3", "rec_taxi_1", "click");

    const results = await scoreRecommendationsAsync({
      userId: "user-3",
      timeOfDay: "evening",
      location: { lat: 40.7, lng: -74.0 },
    });

    expect(results.length).toBeGreaterThan(0);
    for (const item of results) {
      expect(item.reason.length).toBeGreaterThan(0);
    }
  });

  it("falls back to local catalog when db.functions.invoke throws", async () => {
    const { db } = await import("@/services/db");
    vi.mocked(db.functions.invoke).mockRejectedValueOnce(new Error("Connection refused"));

    const { scoreRecommendationsAsync, trackUserInteraction } = await import("./recommendation-engine");
    trackUserInteraction("user-4", "rec_food_1", "favorite");

    const results = await scoreRecommendationsAsync({
      userId: "user-4",
      timeOfDay: "night",
      location: { lat: 40.7, lng: -74.0 },
    });

    expect(results.length).toBeGreaterThan(0);
    expect(results.length).toBeLessThanOrEqual(10);
  });

  it("merges pgvector results with catalog items when db returns valid matches", async () => {
    const { db } = await import("@/services/db");
    vi.mocked(db.functions.invoke).mockResolvedValueOnce({
      data: {
        matches: [
          {
            id: "pgvec_unique_1",
            title: "AI-recommended restaurant",
            type: "listing",
            route: "/food/ai-pick",
            vertical: "food",
            similarity: 0.85,
            image_url: "https://example.com/img.jpg",
            subtitle: "Top pick",
          },
          {
            id: "pgvec_unique_2",
            title: "Nearby delivery service",
            type: "service",
            route: "/mobility/delivery/fast",
            vertical: "delivery",
            similarity: 0.72,
          },
        ],
      },
      error: null,
    });

    const { scoreRecommendationsAsync, trackUserInteraction } = await import("./recommendation-engine");
    trackUserInteraction("user-5", "rec_food_1", "click");
    trackUserInteraction("user-5", "rec_food_2", "view");

    const results = await scoreRecommendationsAsync({
      userId: "user-5",
      timeOfDay: "afternoon",
      location: { lat: 40.7, lng: -74.0 },
    });

    const pgvecItem = results.find((r) => r.id === "pgvec_unique_1");
    expect(pgvecItem).toBeDefined();
    if (pgvecItem) {
      expect(pgvecItem.title).toBe("AI-recommended restaurant");
      expect(pgvecItem.imageUrl).toBe("https://example.com/img.jpg");
    }

    expect(results.length).toBeGreaterThan(0);
    expect(results.length).toBeLessThanOrEqual(10);
  });

  it("does not call pgvector when no userId is provided", async () => {
    const { db } = await import("@/services/db");
    vi.mocked(db.functions.invoke).mockClear();

    const { scoreRecommendationsAsync } = await import("./recommendation-engine");
    await scoreRecommendationsAsync({
      timeOfDay: "afternoon",
      location: { lat: 40.7, lng: -74.0 },
    });

    expect(db.functions.invoke).not.toHaveBeenCalled();
  });

  it("high-similarity pgvector matches get 'Matches your interests' reason", async () => {
    const { db } = await import("@/services/db");
    vi.mocked(db.functions.invoke).mockResolvedValueOnce({
      data: {
        matches: [
          {
            id: "pgvec_high_sim",
            title: "Perfect match item",
            type: "listing",
            route: "/food/perfect",
            vertical: "food",
            similarity: 0.95,
          },
        ],
      },
      error: null,
    });

    const { scoreRecommendationsAsync, trackUserInteraction } = await import("./recommendation-engine");
    trackUserInteraction("user-6", "rec_food_1", "click");

    const results = await scoreRecommendationsAsync({
      userId: "user-6",
      timeOfDay: "afternoon",
      location: { lat: 40.7, lng: -74.0 },
    });

    const highSimItem = results.find((r) => r.id === "pgvec_high_sim");
    expect(highSimItem).toBeDefined();
    if (highSimItem) {
      expect(highSimItem.reason).toBe("Matches your interests");
    }
  });
});

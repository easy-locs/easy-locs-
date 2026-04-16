import { describe, it, expect } from "vitest";
import { predictEta, formatEta } from "@/domains/ride/eta";

describe("ride/eta", () => {
  it("distance 0 returns 0 seconds", () => {
    const p = predictEta({ distanceKm: 0 });
    expect(p.etaSeconds).toBe(0);
  });

  it("uses fallback when no signals", () => {
    const p = predictEta({ distanceKm: 10 });
    expect(p.source).toBe("fallback");
    expect(p.etaSeconds).toBeGreaterThan(0);
  });

  it("prefers fresh live signal over historical", () => {
    const p = predictEta({
      distanceKm: 5,
      live: { avgSpeedKmh: 20, sampleSize: 20, ageSeconds: 10 },
      historical: { medianSeconds: 2000, iqrSeconds: 400, sampleSize: 80 },
    });
    expect(p.source).toBe("blended");
    expect(p.etaSeconds).toBeLessThan(2000);
  });

  it("falls back to historical when live is stale", () => {
    const p = predictEta({
      distanceKm: 5,
      live: { avgSpeedKmh: 20, sampleSize: 2, ageSeconds: 1200 },
      historical: { medianSeconds: 900, iqrSeconds: 180, sampleSize: 100 },
    });
    expect(p.source === "historical" || p.source === "blended").toBe(true);
  });

  it("confidence grows with signal quality", () => {
    const weak = predictEta({ distanceKm: 5 });
    const strong = predictEta({
      distanceKm: 5,
      live: { avgSpeedKmh: 30, sampleSize: 50, ageSeconds: 5 },
      historical: { medianSeconds: 600, iqrSeconds: 120, sampleSize: 200 },
    });
    expect(strong.confidence).toBeGreaterThan(weak.confidence);
  });

  it("low/high bracket encloses eta", () => {
    const p = predictEta({
      distanceKm: 8,
      historical: { medianSeconds: 1000, iqrSeconds: 200, sampleSize: 100 },
    });
    expect(p.lowSeconds).toBeLessThanOrEqual(p.etaSeconds);
    expect(p.highSeconds).toBeGreaterThanOrEqual(p.etaSeconds);
  });

  it("formatEta formats minutes and hours", () => {
    expect(formatEta(45)).toBe("45s");
    expect(formatEta(300)).toBe("5 min");
    expect(formatEta(3900)).toBe("1h 5m");
    expect(formatEta(7200)).toBe("2h");
  });

  it("ignores zero-speed live samples", () => {
    const p = predictEta({
      distanceKm: 3,
      live: { avgSpeedKmh: 0, sampleSize: 10, ageSeconds: 10 },
      historical: { medianSeconds: 500, iqrSeconds: 100, sampleSize: 60 },
    });
    expect(p.source).toBe("historical");
  });
});

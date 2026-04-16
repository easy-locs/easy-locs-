import { describe, it, expect } from "vitest";
import { computeSurge, explainSurge, SURGE_CONFIG } from "@/domains/ride/surge";

describe("ride/surge", () => {
  it("returns 1.0 when demand matches supply", () => {
    const s = computeSurge({ openRequests: 5, availableDrivers: 5 });
    expect(s.multiplier).toBe(1.0);
    expect(s.tier).toBe("none");
    expect(s.audit.reasons).toHaveLength(0);
  });

  it("surges when demand exceeds supply", () => {
    const s = computeSurge({ openRequests: 20, availableDrivers: 4 });
    expect(s.multiplier).toBeGreaterThan(1.0);
    expect(s.audit.reasons.some((r) => r.label.startsWith("demand"))).toBe(true);
  });

  it("respects max cap", () => {
    const s = computeSurge({
      openRequests: 500,
      availableDrivers: 1,
      recentAcceptanceRate: 0.1,
      avgWaitSeconds: 1200,
      weatherFactor: 1.5,
      eventFactor: 1.5,
      hourOfDay: 8,
    });
    expect(s.multiplier).toBeLessThanOrEqual(SURGE_CONFIG.max);
  });

  it("respects min floor", () => {
    const s = computeSurge({ openRequests: 0, availableDrivers: 50 });
    expect(s.multiplier).toBeGreaterThanOrEqual(SURGE_CONFIG.min);
  });

  it("audit trail includes inputs and version", () => {
    const inputs = { openRequests: 10, availableDrivers: 3, hourOfDay: 8 };
    const s = computeSurge(inputs);
    expect(s.audit.inputs).toEqual(inputs);
    expect(s.audit.version).toBe(SURGE_CONFIG.version);
    expect(s.audit.computedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("tiers escalate with multiplier", () => {
    const low = computeSurge({ openRequests: 6, availableDrivers: 4 });
    const high = computeSurge({
      openRequests: 30,
      availableDrivers: 2,
      recentAcceptanceRate: 0.2,
    });
    expect(["none", "low", "moderate"]).toContain(low.tier);
    expect(["high", "moderate", "extreme"]).toContain(high.tier);
    expect(high.multiplier).toBeGreaterThan(low.multiplier);
  });

  it("no drivers available produces significant surge", () => {
    const s = computeSurge({ openRequests: 3, availableDrivers: 0 });
    expect(s.multiplier).toBeGreaterThan(1.3);
  });

  it("rush hour adds baseline reason", () => {
    const s = computeSurge({ openRequests: 5, availableDrivers: 5, hourOfDay: 8 });
    expect(s.audit.reasons.some((r) => r.label === "rush_hour_baseline")).toBe(true);
  });

  it("explainSurge produces human-readable label", () => {
    const s = computeSurge({ openRequests: 20, availableDrivers: 2, recentAcceptanceRate: 0.3 });
    const text = explainSurge(s);
    expect(text).toContain("x surge");
  });

  it("standard pricing label when no surge", () => {
    const s = computeSurge({ openRequests: 0, availableDrivers: 10 });
    expect(explainSurge(s)).toBe("Standard pricing");
  });

  it("low acceptance rate triggers its own reason", () => {
    const s = computeSurge({
      openRequests: 5,
      availableDrivers: 5,
      recentAcceptanceRate: 0.2,
    });
    expect(s.audit.reasons.some((r) => r.label === "low_acceptance_rate")).toBe(true);
  });
});

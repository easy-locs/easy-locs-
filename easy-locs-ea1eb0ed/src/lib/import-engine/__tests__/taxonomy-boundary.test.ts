/**
 * Taxonomy boundary + publish-gate regression tests.
 *
 * Covers the three scenarios the 2026 taxonomy pipeline requires:
 *  1. Unknown subcategory is rejected (confidence < 0.7, cannot publish)
 *  2. Known subcategory passes the guard and can reach the publish gate
 *  3. Franchise dedup: two locations >150m apart are kept separate
 *  4. Pharmacy conflict resolves deterministically to healthcare (not shops)
 *  5. TikTok dedup signal is scored alongside Instagram
 */
import { describe, it, expect } from "vitest";
import { mapCategory } from "@/lib/onboarding/pipeline/taxonomy/taxonomy.category.map";
import { taxonomyRegistry } from "@/lib/taxonomy/taxonomy-registry";
import { computeCanonicalDedupScore, STRATEGIES } from "@/lib/dedup/canonical-dedup-engine";

// ─── 1. Unknown subcategory cannot publish ────────────────────────────────────

describe("boundary guard: unknown subcategory", () => {
  it("caps confidence at ≤0.35 for an unknown food subcategory", () => {
    const result = mapCategory("food", [], ["unknown_fusion_bar"]);
    // Unknown subcategory: flagged via needs_review tag, confidence hard-capped
    expect(result.tags).toContain("needs_review");
    expect(result.confidence).toBeLessThanOrEqual(0.35);
  });

  it("caps confidence at ≤0.35 even when cluster resolves correctly", () => {
    const result = mapCategory("healthcare", ["clinic"], ["not_a_real_specialty"]);
    expect(result.tags).toContain("needs_review");
    expect(result.confidence).toBeLessThanOrEqual(0.35);
  });

  it("allows publish confidence for a known food subcategory", () => {
    const result = mapCategory("food", ["restaurant"], ["fine_dining"]);
    expect(result.tags).not.toContain("needs_review");
    expect(result.confidence).toBeGreaterThanOrEqual(0.70);
  });

  it("allows publish confidence for a known stay subcategory", () => {
    const result = mapCategory("stay", ["hotel"], ["business_hotel"]);
    expect(result.tags).not.toContain("needs_review");
    expect(result.confidence).toBeGreaterThanOrEqual(0.70);
  });
});

// ─── 2. Pharmacy conflict resolves deterministically to healthcare ─────────────

describe("taxonomy registry: pharmacy conflict resolution", () => {
  it("resolves 'pharmacy' to healthcare (not shops)", () => {
    const resolution = taxonomyRegistry.resolve("pharmacy");
    expect(resolution.vertical).toBe("healthcare");
    expect(resolution.flaggedForReview).toBe(false);
  });

  it("resolves 'drugstore' to healthcare", () => {
    const resolution = taxonomyRegistry.resolve("drugstore");
    expect(resolution.vertical).toBe("healthcare");
  });

  it("resolves 'dental clinic' to healthcare with subcategory=dental", () => {
    const resolution = taxonomyRegistry.resolve("dental clinic");
    expect(resolution.vertical).toBe("healthcare");
    expect(resolution.canonicalType).toBe("dental");
  });
});

// ─── 3. Franchise dedup: >150m apart keeps separate ──────────────────────────

describe("franchise dedup: GPS hard blocker", () => {
  const base = {
    id: "a",
    name: "Subway",
    vertical: "food",
    city: "Dubai",
    lat: 25.197,
    lng: 55.274,
    phone: null,
    address: null,
    website: "https://subway.com",
  };

  const sameBranch = { ...base, id: "b", lat: 25.197, lng: 55.274 };

  const farBranch = {
    ...base,
    id: "c",
    lat: 25.199,
    lng: 55.278,
  };

  it("two same-location franchise branches can auto-merge", () => {
    const result = computeCanonicalDedupScore(base, sameBranch, STRATEGIES.franchise);
    expect(result.action).not.toBe("keep_separate");
  });

  it("two franchise branches >150m apart are kept separate", () => {
    const result = computeCanonicalDedupScore(base, farBranch, STRATEGIES.franchise);
    expect(result.confidence).toBeLessThanOrEqual(40);
    expect(result.action).toBe("keep_separate");
  });
});

// ─── 4. TikTok is a scored dedup signal ──────────────────────────────────────

describe("dedup: TikTok signal", () => {
  const base = {
    id: "a",
    name: "Beauty Clinic",
    lat: 25.2,
    lng: 55.27,
    phone: "+971501234567",
    address: "Shop 1, Dubai Mall",
    vertical: "beauty",
    city: "Dubai",
    tiktokHandle: "beautyclinic_ae",
    instagramHandle: null,
  };

  const sameHandle = { ...base, id: "b" };
  const differentHandle = { ...base, id: "c", tiktokHandle: "something_else_ae" };

  it("matching TikTok handles contribute a positive signal", () => {
    const result = computeCanonicalDedupScore(base, sameHandle, STRATEGIES.storefront);
    expect(result.matchedOn).toContain("tiktok");
    expect(result.signals.some(s => s.signal === "tiktok" && s.score === 1)).toBe(true);
  });

  it("different TikTok handles do not add a tiktok match", () => {
    const result = computeCanonicalDedupScore(base, differentHandle, STRATEGIES.storefront);
    expect(result.matchedOn).not.toContain("tiktok");
  });
});

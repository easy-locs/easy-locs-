/**
 * Legacy Facade Test — Confirms old import paths now delegate to canonical engine.
 */
import { describe, it, expect } from "vitest";
import { detectDuplicates, mergeRecords, scoreQuality } from "@/lib/import/universal-import-engine";
import { classifyVertical } from "@/lib/onboarding/vertical-classifier.engine";

describe("Legacy universal-import-engine facade", () => {
  it("detectDuplicates delegates to canonical engine", () => {
    const records = [
      { source: "deliveroo", sourceEntityId: "a", vertical: "food" as const, name: "Test", lat: 25.2, lng: 55.3, phone: "+971501111111" },
      { source: "talabat", sourceEntityId: "b", vertical: "food" as const, name: "Test", lat: 25.2, lng: 55.3, phone: "+971501111111" },
    ];
    const matches = detectDuplicates(records as any);
    expect(matches.length).toBeGreaterThanOrEqual(1);
    expect(matches[0].matchedOn).toContain("name");
  });

  it("mergeRecords delegates to canonical engine", () => {
    const records = [
      { source: "deliveroo", sourceEntityId: "a", vertical: "food" as const, name: "Test Restaurant", city: "Dubai", phone: "+971501111111", categories: ["restaurant"], menuItems: [{ name: "Burger", price: 20 }], photos: [], hotelInventory: [], serviceItems: [], sourceProofs: [] },
    ];
    const result = mergeRecords(records as any, "food");
    expect(result.merged.canonicalName).toBe("Test Restaurant");
    expect(result.merged.vertical).toBe("food");
  });

  it("scoreQuality delegates to canonical engine", () => {
    const record = {
      entityId: "test-1", vertical: "food" as const,
      canonicalName: "Test Restaurant", city: "Dubai", country: "AE",
      lat: 25.2, lng: 55.3, phone: "+971501111111", address: "Test St",
      photos: ["a.jpg"], menuItems: [{ name: "Burger", price: 20 }],
      hotelInventory: [], serviceItems: [], sourceProofs: [{ source: "deliveroo", field: "entity", value: "a", confidence: 0.7, fetchedAt: new Date().toISOString(), url: null }],
      categories: ["restaurant"], subcategories: [],
      mergeConfidence: 0.8, missingFields: [], needsReview: false,
    };
    const report = scoreQuality(record as any);
    expect(report.score).toBeGreaterThan(0);
    expect(report).toHaveProperty("completeness");
    expect(report).toHaveProperty("readyToPublish");
  });
});

describe("Legacy vertical-classifier facade", () => {
  it("classifyVertical delegates to canonical engine", () => {
    const result = classifyVertical({ businessName: "Pizza Palace Pizzeria" });
    expect(result.vertical).toBe("food");
    expect(result.confidence).toBeGreaterThan(30);
  });

  it("classifies hotel from source type", () => {
    const result = classifyVertical({ businessName: "Some Place", sourceType: "booking" });
    expect(result.vertical).toBe("hotel");
    expect(result.confidence).toBe(90);
  });
});

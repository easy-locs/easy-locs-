import { describe, it, expect } from "vitest";
import { scoreQuality } from "../quality/quality-scorer";
import type { CanonicalEntity } from "../types";

function makeEntity(overrides: Partial<CanonicalEntity> = {}): CanonicalEntity {
  return {
    entityId: "test-1",
    vertical: "food",
    status: "draft",
    canonicalName: "Test Restaurant",
    branchName: null,
    slug: "test-restaurant",
    description: "A test restaurant",
    taxonomy: { family: "food_beverage", category: "restaurant", subcategory: "general", tags: [], confidence: 85 },
    address: "123 Main St",
    city: "Dubai",
    district: null,
    country: "AE",
    lat: 25.2,
    lng: 55.27,
    phone: "+971501234567",
    website: null,
    menuItems: [{ name: "Burger", price: 30 }],
    hotelInventory: [],
    serviceItems: [],
    photos: ["https://example.com/photo.jpg"],
    logoUrl: "https://example.com/logo.jpg",
    rating: 4.5,
    reviewCount: 100,
    openingHours: null,
    seoTitle: "Test",
    seoDescription: "Test desc",
    sourceProofs: [{ source: "deliveroo", field: "name", value: "Test", confidence: 0.9, fetchedAt: new Date().toISOString() }],
    mergeConfidence: 0.9,
    missingFields: [],
    needsReview: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("Quality Scorer", () => {
  it("scores a complete food entity high", () => {
    const report = scoreQuality(makeEntity());
    expect(report.score).toBeGreaterThanOrEqual(60);
    expect(report.readyToPublish).toBe(true);
  });

  it("penalizes missing photos", () => {
    const full = scoreQuality(makeEntity());
    const noPhotos = scoreQuality(makeEntity({ photos: [] }));
    expect(noPhotos.media).toBe(0);
    expect(noPhotos.score).toBeLessThan(full.score);
  });

  it("penalizes missing coordinates", () => {
    const report = scoreQuality(makeEntity({ lat: null, lng: null }));
    expect(report.location).toBeLessThanOrEqual(30);
    expect(report.details).toContain("No coordinates");
  });

  it("penalizes missing menu for food", () => {
    const report = scoreQuality(makeEntity({ menuItems: [] }));
    expect(report.catalog).toBe(0);
    expect(report.details).toContain("No catalog items");
  });

  it("marks entity as not ready to publish when missing required fields", () => {
    const report = scoreQuality(makeEntity({ canonicalName: null, address: null }));
    expect(report.readyToPublish).toBe(false);
  });

  it("provides 5 dimension scores", () => {
    const report = scoreQuality(makeEntity());
    expect(report).toHaveProperty("completeness");
    expect(report).toHaveProperty("media");
    expect(report).toHaveProperty("location");
    expect(report).toHaveProperty("catalog");
    expect(report).toHaveProperty("trust");
  });
});

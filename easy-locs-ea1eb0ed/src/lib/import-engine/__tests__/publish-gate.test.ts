import { describe, it, expect } from "vitest";
import { evaluatePublishGate } from "../quality/publish-gate";
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
    description: "A test",
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

describe("Publish Gate", () => {
  it("allows a complete, high-quality food entity", () => {
    const entity = makeEntity();
    const quality = scoreQuality(entity);
    const decision = evaluatePublishGate(entity, quality);
    expect(decision.allowed).toBe(true);
    expect(decision.targetStatus).toBe("ready");
  });

  it("blocks entity missing required phone for food", () => {
    const entity = makeEntity({ phone: null });
    const quality = scoreQuality(entity);
    const decision = evaluatePublishGate(entity, quality);
    expect(decision.allowed).toBe(false);
    expect(decision.reasons.some(r => r.includes("phone"))).toBe(true);
  });

  it("blocks entity with invalid latitude", () => {
    const entity = makeEntity({ lat: 999 });
    const quality = scoreQuality(entity);
    const decision = evaluatePublishGate(entity, quality);
    expect(decision.allowed).toBe(false);
    expect(decision.reasons.some(r => r.includes("latitude"))).toBe(true);
  });

  it("blocks food entity with no menu items", () => {
    const entity = makeEntity({ menuItems: [] });
    const quality = scoreQuality(entity);
    const decision = evaluatePublishGate(entity, quality);
    expect(decision.allowed).toBe(false);
    expect(decision.reasons.some(r => r.includes("menu"))).toBe(true);
  });

  it("blocks hotel entity with no photos", () => {
    const entity = makeEntity({ vertical: "hotel", menuItems: [], photos: [] });
    const quality = scoreQuality(entity);
    const decision = evaluatePublishGate(entity, quality);
    expect(decision.allowed).toBe(false);
    expect(decision.reasons.some(r => r.includes("photo"))).toBe(true);
  });

  it("blocks entity with very low quality score", () => {
    const entity = makeEntity({ canonicalName: null, address: null, lat: null, lng: null, phone: null, photos: [], menuItems: [] });
    const quality = scoreQuality(entity);
    const decision = evaluatePublishGate(entity, quality);
    expect(decision.allowed).toBe(false);
    expect(decision.targetStatus).toBe("draft");
  });
});

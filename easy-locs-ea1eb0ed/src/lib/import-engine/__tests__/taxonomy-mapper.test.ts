import { describe, it, expect } from "vitest";
import { mapToTaxonomy, isTaxonomyComplete } from "../taxonomy/taxonomy-mapper";
import type { SourceEntityRecord } from "../types";

function makeRecord(overrides: Partial<SourceEntityRecord>): SourceEntityRecord {
  return {
    source: "official_web",
    sourceEntityId: "test-1",
    vertical: "food",
    ...overrides,
  } as SourceEntityRecord;
}

describe("Taxonomy Mapper", () => {
  it("maps food/pizza to restaurant/pizza", () => {
    const t = mapToTaxonomy(makeRecord({ vertical: "food", categories: ["pizza"] }));
    expect(t.family).toBe("food_beverage");
    expect(t.category).toBe("restaurant");
    expect(t.subcategory).toBe("pizza");
    expect(t.confidence).toBe(85);
  });

  it("maps grocery/supermarket correctly", () => {
    const t = mapToTaxonomy(makeRecord({ vertical: "grocery", categories: ["supermarket"] }));
    expect(t.family).toBe("retail_grocery");
    expect(t.category).toBe("grocery_store");
    expect(t.subcategory).toBe("supermarket");
  });

  it("maps hotel/resort correctly", () => {
    const t = mapToTaxonomy(makeRecord({ vertical: "hotel", categories: ["resort"] }));
    expect(t.family).toBe("hospitality");
    expect(t.category).toBe("accommodation");
    expect(t.subcategory).toBe("resort");
  });

  it("maps services/salon correctly", () => {
    const t = mapToTaxonomy(makeRecord({ vertical: "services", categories: ["salon"] }));
    expect(t.family).toBe("professional_services");
    expect(t.category).toBe("beauty");
    expect(t.subcategory).toBe("salon");
  });

  it("maps property/villa correctly", () => {
    const t = mapToTaxonomy(makeRecord({ vertical: "property", categories: ["villa"] }));
    expect(t.family).toBe("real_estate");
    expect(t.category).toBe("residential");
    expect(t.subcategory).toBe("villa");
  });

  it("resolves aliases (fast food → fast_food)", () => {
    const t = mapToTaxonomy(makeRecord({ vertical: "food", categories: ["fast food"] }));
    expect(t.subcategory).toBe("fast_food");
  });

  it("falls back with low confidence for unknown category", () => {
    const t = mapToTaxonomy(makeRecord({ vertical: "food", categories: ["unknown_thing"] }));
    expect(t.category).toBe("restaurant");
    expect(t.subcategory).toBe("general");
    expect(t.confidence).toBe(30);
  });

  it("isTaxonomyComplete returns true for valid taxonomy", () => {
    const t = mapToTaxonomy(makeRecord({ vertical: "food", categories: ["pizza"] }));
    expect(isTaxonomyComplete(t)).toBe(true);
  });

  it("isTaxonomyComplete returns false for fallback", () => {
    const t = mapToTaxonomy(makeRecord({ vertical: "food", categories: ["xyz"] }));
    expect(isTaxonomyComplete(t)).toBe(false);
  });
});

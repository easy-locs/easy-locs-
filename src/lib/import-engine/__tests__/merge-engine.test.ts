import { describe, it, expect } from "vitest";
import { mergeCluster } from "../merge/merge-engine";
import type { SourceEntityRecord } from "../types";

function rec(source: string, overrides: Partial<SourceEntityRecord> = {}): SourceEntityRecord {
  return {
    source: source as any,
    sourceEntityId: `${source}-1`,
    vertical: "food",
    name: "Test Restaurant",
    ...overrides,
  } as SourceEntityRecord;
}

describe("Merge Engine", () => {
  it("merges a single record into a canonical entity", () => {
    const { entity } = mergeCluster(
      [rec("deliveroo", { name: "Pizza Palace", lat: 25.1, lng: 55.2, address: "JLT", city: "Dubai", categories: ["pizza"] })],
      "food",
    );
    expect(entity.canonicalName).toBe("Pizza Palace");
    expect(entity.lat).toBe(25.1);
    expect(entity.city).toBe("Dubai");
    expect(entity.taxonomy.family).toBe("food_beverage");
    expect(entity.status).toBe("draft");
  });

  it("merges multiple sources with field priority", () => {
    const { entity } = mergeCluster([
      rec("deliveroo", { name: "Pizza Palace Deliveroo", phone: "+971501111111", menuItems: [{ name: "Margherita", price: 30 }] }),
      rec("official_web", { name: "Pizza Palace", phone: "+971502222222", description: "Best pizza in town" }),
    ], "food");
    // official_web wins canonicalName for food vertical
    expect(entity.canonicalName).toBe("Pizza Palace");
    // official_web wins phone for food vertical
    expect(entity.phone).toBe("+971502222222");
    // Menu items from deliveroo preserved
    expect(entity.menuItems.length).toBe(1);
  });

  it("deduplicates menu items by name", () => {
    const { entity } = mergeCluster([
      rec("deliveroo", { menuItems: [{ name: "Margherita", price: 30 }, { name: "Pepperoni", price: 35 }] }),
      rec("talabat", { menuItems: [{ name: "Margherita", price: 29 }, { name: "BBQ", price: 40 }] }),
    ], "food");
    expect(entity.menuItems.length).toBe(3); // Margherita deduped
  });

  it("merges photos from all sources without duplicates", () => {
    const { entity } = mergeCluster([
      rec("deliveroo", { photos: ["https://a.com/1.jpg", "https://a.com/2.jpg"] }),
      rec("talabat", { photos: ["https://a.com/2.jpg", "https://b.com/3.jpg"] }),
    ], "food");
    expect(entity.photos.length).toBe(3);
  });

  it("generates SEO fields", () => {
    const { entity } = mergeCluster(
      [rec("deliveroo", { name: "Ravi Restaurant", city: "Dubai", categories: ["restaurant"] })],
      "food",
    );
    expect(entity.seoTitle).toBeTruthy();
    expect(entity.slug).toContain("ravi");
  });

  it("tracks source provenance", () => {
    const { entity } = mergeCluster([
      rec("deliveroo", { name: "X", phone: "+971500000001" }),
      rec("official_web", { name: "X Official" }),
    ], "food");
    expect(entity.sourceProofs.length).toBeGreaterThan(0);
    expect(entity.sourceProofs.some(p => p.source === "official_web")).toBe(true);
  });
});

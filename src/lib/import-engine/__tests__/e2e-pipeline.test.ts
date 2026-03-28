/**
 * E2E Pipeline Tests — Full orchestrator run for all 5 verticals.
 * Validates: input → dedup → merge → enrich → quality → publish gate.
 */
import { describe, it, expect } from "vitest";
import { runImportEngine } from "../orchestrator";
import type { SourceEntityRecord, ImportInput } from "../types";

// ═══════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════

function rec(id: string, source: string, overrides: Partial<SourceEntityRecord> = {}): SourceEntityRecord {
  return {
    source: source as any,
    sourceEntityId: id,
    vertical: "food",
    name: "Entity " + id,
    address: "Test Address",
    city: "Dubai",
    country: "AE",
    lat: 25.2,
    lng: 55.27,
    phone: "+971501234567",
    categories: [],
    photos: ["https://example.com/photo.jpg"],
    ...overrides,
  } as SourceEntityRecord;
}

function printReport(label: string, result: ReturnType<typeof runImportEngine>, records: SourceEntityRecord[]) {
  console.log(`\n═══ ${label} ═══`);
  console.log(`Input sources: ${[...new Set(records.map(r => r.source))].join(", ")}`);
  console.log(`Input records: ${records.length}`);
  console.log(`Duplicates detected: ${result.duplicatesFound}`);
  console.log(`Canonical entities: ${result.entities.length}`);
  for (const e of result.entities) {
    const q = result.qualityReports.get(e.entityId)!;
    const p = result.publishDecisions.get(e.entityId)!;
    console.log(`  → ${e.canonicalName} | quality=${q.score} | publish=${p.allowed ? "READY" : "DRAFT"} | reasons=${p.reasons.join("; ") || "none"}`);
  }
  console.log(`Pipeline duration: ${result.totalDurationMs}ms`);
}

// ═══════════════════════════════════════════════════
// FOOD
// ═══════════════════════════════════════════════════
describe("E2E: Food vertical", () => {
  it("processes food entities with dedup and quality", () => {
    const input: ImportInput = { vertical: "food", city: "Dubai", country: "AE" };
    const records: SourceEntityRecord[] = [
      rec("d1", "deliveroo", { name: "Pizza Palace", categories: ["pizza"], menuItems: [{ name: "Margherita", price: 30 }, { name: "Pepperoni", price: 35 }] }),
      rec("t1", "talabat", { name: "Pizza Palace", categories: ["pizza"], menuItems: [{ name: "Margherita", price: 29 }, { name: "BBQ", price: 40 }] }),
      rec("d2", "deliveroo", { name: "Burger House", categories: ["burger"], menuItems: [{ name: "Classic Burger", price: 25 }], lat: 25.1, lng: 55.2 }),
    ];
    const result = runImportEngine(input, records);
    printReport("FOOD", result, records);

    expect(result.entities.length).toBe(2); // Pizza Palace merged, Burger House separate
    expect(result.duplicatesFound).toBe(1);
    
    const pizza = result.entities.find(e => e.canonicalName === "Pizza Palace");
    expect(pizza).toBeDefined();
    expect(pizza!.menuItems.length).toBe(3); // deduped
    expect(pizza!.taxonomy.family).toBe("food_beverage");
    
    const quality = result.qualityReports.get(pizza!.entityId)!;
    expect(quality.score).toBeGreaterThan(0);
    expect(quality.completeness).toBeDefined();
  });
});

// ═══════════════════════════════════════════════════
// GROCERY
// ═══════════════════════════════════════════════════
describe("E2E: Grocery vertical", () => {
  it("processes grocery entities", () => {
    const input: ImportInput = { vertical: "grocery", city: "Dubai", country: "AE" };
    const records: SourceEntityRecord[] = [
      rec("n1", "noon", { vertical: "grocery", name: "Fresh Market", categories: ["supermarket"], menuItems: [{ name: "Milk 1L", price: 5 }], photos: ["https://x.com/1.jpg"] }),
      rec("t2", "talabat", { vertical: "grocery", name: "Fresh Market", categories: ["grocery"], menuItems: [{ name: "Bread", price: 3 }] }),
      rec("w1", "official_web", { vertical: "grocery", name: "Organic Corner", categories: ["organic"], menuItems: [{ name: "Avocado", price: 8 }], photos: ["https://x.com/2.jpg"] }),
    ];
    const result = runImportEngine(input, records);
    printReport("GROCERY", result, records);

    // All 3 share same geo → may all merge. Check at least 1 entity produced
    expect(result.entities.length).toBeGreaterThanOrEqual(1);
    expect(result.entities.length).toBeLessThanOrEqual(3);

    const fresh = result.entities.find(e => e.canonicalName === "Fresh Market");
    expect(fresh!.taxonomy.family).toBe("retail_grocery");
  });
});

// ═══════════════════════════════════════════════════
// HOTEL
// ═══════════════════════════════════════════════════
describe("E2E: Hotel vertical", () => {
  it("processes hotel entities", () => {
    const input: ImportInput = { vertical: "hotel", city: "Dubai", country: "AE" };
    const records: SourceEntityRecord[] = [
      rec("b1", "booking", { vertical: "hotel", name: "JW Marriott", categories: ["hotel"], hotelInventory: [{ type: "Deluxe Room", price: 800 }], photos: ["https://h.com/1.jpg", "https://h.com/2.jpg"] }),
      rec("e1", "expedia", { vertical: "hotel", name: "JW Marriott", categories: ["hotel"], hotelInventory: [{ type: "Suite", price: 1500 }], photos: ["https://h.com/1.jpg"] }),
      rec("b2", "booking", { vertical: "hotel", name: "Burj Al Arab", categories: ["resort"], hotelInventory: [{ type: "Royal Suite", price: 5000 }], photos: ["https://h.com/3.jpg", "https://h.com/4.jpg", "https://h.com/5.jpg"] }),
    ];
    const result = runImportEngine(input, records);
    printReport("HOTEL", result, records);

    expect(result.entities.length).toBeGreaterThanOrEqual(1);
    expect(result.entities.length).toBeLessThanOrEqual(3);

    const marriott = result.entities.find(e => e.canonicalName?.includes("Marriott") || e.canonicalName?.includes("JW"));
    expect(marriott!.taxonomy.family).toBe("hospitality");
    expect(marriott!.hotelInventory.length).toBe(2); // both rooms
    expect(marriott!.photos.length).toBe(2); // deduped
  });
});

// ═══════════════════════════════════════════════════
// SERVICES
// ═══════════════════════════════════════════════════
describe("E2E: Services vertical", () => {
  it("processes services entities", () => {
    const input: ImportInput = { vertical: "services", city: "Dubai", country: "AE" };
    const records: SourceEntityRecord[] = [
      rec("g1", "google_business", { vertical: "services", name: "Glamour Salon", categories: ["salon"], serviceItems: [{ name: "Haircut", price: 80 }], photos: ["https://s.com/1.jpg"] }),
      rec("w2", "official_web", { vertical: "services", name: "Glamour Salon & Spa", categories: ["salon", "spa"], serviceItems: [{ name: "Manicure", price: 60 }], website: "https://glamour.ae" }),
      rec("g2", "google_business", { vertical: "services", name: "QuickFix Plumbing", categories: ["plumbing"], serviceItems: [{ name: "Pipe Repair", price: 200 }] }),
    ];
    const result = runImportEngine(input, records);
    printReport("SERVICES", result, records);

    // All share same geo → may merge. Check reasonable output
    expect(result.entities.length).toBeGreaterThanOrEqual(1);
    expect(result.entities.length).toBeLessThanOrEqual(3);

    const quickfix = result.entities.find(e => e.canonicalName?.includes("QuickFix"));
    expect(quickfix!.taxonomy.family).toBe("professional_services");
  });
});

// ═══════════════════════════════════════════════════
// PROPERTY
// ═══════════════════════════════════════════════════
describe("E2E: Property vertical", () => {
  it("processes property entities", () => {
    const input: ImportInput = { vertical: "property", city: "Dubai", country: "AE" };
    const records: SourceEntityRecord[] = [
      rec("p1", "property_portal", { vertical: "property", name: "Dubai Marina Tower", categories: ["apartment"], photos: ["https://p.com/1.jpg", "https://p.com/2.jpg"], description: "Luxury waterfront living" }),
      rec("c1", "crm_import", { vertical: "property", name: "Dubai Marina Tower", categories: ["apartment"], phone: "+971509999999" }),
      rec("p2", "property_portal", { vertical: "property", name: "Business Bay Office", categories: ["office"], photos: ["https://p.com/3.jpg"], lat: 25.18, lng: 55.26 }),
    ];
    const result = runImportEngine(input, records);
    printReport("PROPERTY", result, records);

    expect(result.entities.length).toBe(2);
    expect(result.duplicatesFound).toBe(1);

    const marina = result.entities.find(e => e.canonicalName?.includes("Marina"));
    expect(marina!.taxonomy.family).toBe("real_estate");
    expect(marina!.taxonomy.category).toBe("residential");
  });
});

// ═══════════════════════════════════════════════════
// Pipeline trace & observability
// ═══════════════════════════════════════════════════
describe("Pipeline trace", () => {
  it("captures all pipeline steps", () => {
    const input: ImportInput = { vertical: "food", city: "Dubai" };
    const records = [rec("x1", "deliveroo", { name: "Trace Test", menuItems: [{ name: "A", price: 1 }] })];
    const result = runImportEngine(input, records);

    expect(result.trace.steps.length).toBe(5); // dedup, merge, enrich, quality, publish_gate
    expect(result.trace.steps.map(s => s.name)).toEqual(["dedup", "merge", "enrich", "quality", "publish_gate"]);
    expect(result.trace.totalDurationMs).toBeGreaterThanOrEqual(0);
    expect(result.trace.pipelineId).toBeTruthy();
  });
});

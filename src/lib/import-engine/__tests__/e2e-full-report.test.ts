/**
 * E2E Full Report Test — Real pipeline test across all 5 verticals
 * Produces a per-vertical audit report:
 *   input count | duplicates found | entities ready | entities draft | block reasons
 */
import { describe, it, expect } from "vitest";
import { runImportEngine } from "../orchestrator";
import type { SourceEntityRecord, Vertical } from "../types";

// ─── Test Data Factory ───
function makeRecord(overrides: Partial<SourceEntityRecord> & { source: any; sourceEntityId: string; vertical: any }): SourceEntityRecord {
  return {
    name: null, address: null, city: null, country: null, lat: null, lng: null,
    phone: null, website: null, categories: [], subcategories: [],
    menuItems: [], hotelInventory: [], serviceItems: [], photos: [],
    rating: null, reviewCount: null, description: null,
    ...overrides,
  };
}

const VERTICAL_TEST_DATA: Record<Vertical, SourceEntityRecord[]> = {
  food: [
    makeRecord({ source: "deliveroo", sourceEntityId: "food-1", vertical: "food", name: "Al Mallah Restaurant", city: "Dubai", country: "AE", lat: 25.2285, lng: 55.2744, phone: "+971501234567", address: "Satwa Road", categories: ["restaurant", "lebanese"], menuItems: [{ name: "Shawarma", price: 15 }, { name: "Falafel", price: 10 }, { name: "Hummus", price: 8 }], photos: ["https://example.com/photo1.jpg", "https://example.com/photo2.jpg"], rating: 4.5, reviewCount: 1200 }),
    makeRecord({ source: "talabat", sourceEntityId: "food-2", vertical: "food", name: "Al Mallah Restaurant", city: "Dubai", country: "AE", lat: 25.2286, lng: 55.2745, phone: "+971501234567", address: "Al Satwa", categories: ["restaurant"], menuItems: [{ name: "Shawarma", price: 15 }, { name: "Manakish", price: 12 }], photos: ["https://example.com/photo3.jpg"], rating: 4.3, reviewCount: 800 }),
    makeRecord({ source: "google_business" as any, sourceEntityId: "food-3", vertical: "food", name: "Ravi Restaurant", city: "Dubai", country: "AE", lat: 25.2290, lng: 55.2750, phone: "+971502345678", address: "Al Satwa Road", categories: ["restaurant", "pakistani"], menuItems: [{ name: "Biryani", price: 20 }, { name: "Tandoori", price: 25 }], photos: ["https://example.com/ravi1.jpg"], rating: 4.3, reviewCount: 3200 }),
  ],
  grocery: [
    makeRecord({ source: "noon", sourceEntityId: "groc-1", vertical: "grocery", name: "Carrefour Market", city: "Dubai", country: "AE", lat: 25.1972, lng: 55.2744, phone: "+971508001234", address: "Dubai Mall", categories: ["supermarket"], photos: ["https://example.com/carrefour.jpg"] }),
    makeRecord({ source: "official_web", sourceEntityId: "groc-2", vertical: "grocery", name: "Organic Foods & Café", city: "Dubai", country: "AE", lat: 25.0657, lng: 55.1713, phone: "+971509876543", address: "Al Wasl Road", categories: ["organic_store"], photos: ["https://example.com/organic.jpg"] }),
  ],
  hotel: [
    makeRecord({ source: "booking", sourceEntityId: "hotel-1", vertical: "hotel", name: "Atlantis The Palm", city: "Dubai", country: "AE", lat: 25.1304, lng: 55.1174, phone: "+97144260000", address: "Crescent Road, The Palm", categories: ["resort"], hotelInventory: [{ name: "Deluxe Room", price: 500 }, { name: "Suite", price: 1200 }], photos: ["https://example.com/atlantis1.jpg", "https://example.com/atlantis2.jpg", "https://example.com/atlantis3.jpg"], rating: 4.7, reviewCount: 15000 }),
    makeRecord({ source: "expedia", sourceEntityId: "hotel-2", vertical: "hotel", name: "Atlantis The Palm", city: "Dubai", country: "AE", lat: 25.1305, lng: 55.1175, phone: "+97144260000", address: "Palm Jumeirah", categories: ["resort"], hotelInventory: [{ name: "Deluxe Room", price: 480 }], photos: ["https://example.com/atlantis4.jpg"], rating: 4.6, reviewCount: 12000 }),
    makeRecord({ source: "booking", sourceEntityId: "hotel-3", vertical: "hotel", name: "Burj Al Arab", city: "Dubai", country: "AE", lat: 25.1412, lng: 55.1853, phone: "+97143017777", address: "Jumeirah Beach Road", categories: ["hotel"], hotelInventory: [{ name: "Royal Suite", price: 5000 }], photos: ["https://example.com/burj1.jpg", "https://example.com/burj2.jpg"], rating: 4.9, reviewCount: 8000 }),
  ],
  services: [
    makeRecord({ source: "google_business" as any, sourceEntityId: "svc-1", vertical: "services", name: "Tips & Toes Salon", city: "Dubai", country: "AE", lat: 25.2048, lng: 55.2708, phone: "+971506789012", address: "JBR Walk", categories: ["salon"], serviceItems: [{ name: "Manicure", price: 80 }, { name: "Pedicure", price: 100 }], photos: ["https://example.com/tips1.jpg"], rating: 4.2, reviewCount: 500 }),
    makeRecord({ source: "official_web", sourceEntityId: "svc-2", vertical: "services", name: "White & Co Dental", city: "Dubai", country: "AE", lat: 25.1850, lng: 55.2600, phone: "+971504567890", address: "DIFC Gate Avenue", categories: ["clinic"], serviceItems: [{ name: "Teeth Cleaning", price: 300 }, { name: "Whitening", price: 800 }], photos: ["https://example.com/dental1.jpg"], rating: 4.8, reviewCount: 200 }),
  ],
  property: [
    makeRecord({ source: "property_portal", sourceEntityId: "prop-1", vertical: "property", name: "Marina Heights Tower", city: "Dubai", country: "AE", lat: 25.0770, lng: 55.1330, phone: "+971507654321", address: "Dubai Marina", categories: ["apartment", "rent"], photos: ["https://example.com/marina1.jpg", "https://example.com/marina2.jpg"] }),
    makeRecord({ source: "crm_import", sourceEntityId: "prop-2", vertical: "property", name: "Palm Jumeirah Villa", city: "Dubai", country: "AE", lat: 25.1200, lng: 55.1350, phone: "+971501112233", address: "Frond N, Palm Jumeirah", categories: ["villa", "sale"], photos: ["https://example.com/palm1.jpg", "https://example.com/palm2.jpg", "https://example.com/palm3.jpg"] }),
  ],
};

interface VerticalReport {
  vertical: Vertical;
  inputCount: number;
  duplicatesFound: number;
  entitiesReady: number;
  entitiesDraft: number;
  totalEntities: number;
  avgQualityScore: number;
  blockReasons: string[];
  publishDecisions: Array<{ entity: string; allowed: boolean; status: string; score: number; reasons: string[] }>;
}

function runVerticalReport(vertical: Vertical): VerticalReport {
  const records = VERTICAL_TEST_DATA[vertical];
  const result = runImportEngine({ vertical }, records);

  const readyEntities = [...result.publishDecisions.values()].filter(d => d.allowed);
  const draftEntities = [...result.publishDecisions.values()].filter(d => !d.allowed);
  const allReasons = draftEntities.flatMap(d => d.reasons);
  const avgScore = result.entities.length > 0
    ? Math.round([...result.qualityReports.values()].reduce((s, r) => s + r.score, 0) / result.entities.length)
    : 0;

  return {
    vertical,
    inputCount: records.length,
    duplicatesFound: result.duplicatesFound,
    entitiesReady: readyEntities.length,
    entitiesDraft: draftEntities.length,
    totalEntities: result.entities.length,
    avgQualityScore: avgScore,
    blockReasons: [...new Set(allReasons)],
    publishDecisions: result.entities.map(e => {
      const d = result.publishDecisions.get(e.entityId)!;
      const q = result.qualityReports.get(e.entityId)!;
      return { entity: e.canonicalName ?? "unnamed", allowed: d.allowed, status: d.targetStatus, score: q.score, reasons: d.reasons };
    }),
  };
}

describe("Import Engine — Full E2E Report (All Verticals)", () => {
  const reports: VerticalReport[] = [];

  for (const vertical of ["food", "grocery", "hotel", "services", "property"] as Vertical[]) {
    it(`processes ${vertical} vertical correctly`, () => {
      const report = runVerticalReport(vertical);
      reports.push(report);

      // Basic assertions
      expect(report.inputCount).toBeGreaterThan(0);
      expect(report.totalEntities).toBeGreaterThan(0);
      expect(report.totalEntities).toBeLessThanOrEqual(report.inputCount);
      expect(report.entitiesReady + report.entitiesDraft).toBe(report.totalEntities);

      // Quality scores should be in valid range
      expect(report.avgQualityScore).toBeGreaterThanOrEqual(0);
      expect(report.avgQualityScore).toBeLessThanOrEqual(100);
    });
  }

  it("food: deduplicates Al Mallah across Deliveroo + Talabat", () => {
    const r = runVerticalReport("food");
    // 3 input records, 2 are duplicates → should produce 2 entities
    expect(r.duplicatesFound).toBeGreaterThanOrEqual(1);
    expect(r.totalEntities).toBeLessThan(r.inputCount);
  });

  it("hotel: deduplicates Atlantis across Booking + Expedia", () => {
    const r = runVerticalReport("hotel");
    expect(r.duplicatesFound).toBeGreaterThanOrEqual(1);
    expect(r.totalEntities).toBeLessThan(r.inputCount);
  });

  it("grocery: both entities are unique (no dedup)", () => {
    const r = runVerticalReport("grocery");
    expect(r.duplicatesFound).toBe(0);
    expect(r.totalEntities).toBe(2);
  });

  it("produces comprehensive report across all verticals", () => {
    const allReports = (["food", "grocery", "hotel", "services", "property"] as Vertical[]).map(runVerticalReport);

    // Print report to console for visibility
    console.log("\n" + "═".repeat(80));
    console.log("  IMPORT ENGINE — FULL VERTICAL REPORT");
    console.log("═".repeat(80));

    for (const r of allReports) {
      console.log(`\n┌── ${r.vertical.toUpperCase()} ──────────────────────────────`);
      console.log(`│ Input records:      ${r.inputCount}`);
      console.log(`│ Duplicates found:   ${r.duplicatesFound}`);
      console.log(`│ Entities generated: ${r.totalEntities}`);
      console.log(`│ Ready (publish):    ${r.entitiesReady}`);
      console.log(`│ Draft (blocked):    ${r.entitiesDraft}`);
      console.log(`│ Avg quality score:  ${r.avgQualityScore}/100`);
      if (r.blockReasons.length > 0) {
        console.log(`│ Block reasons:      ${r.blockReasons.join("; ")}`);
      }
      console.log(`│`);
      for (const d of r.publishDecisions) {
        const icon = d.allowed ? "✅" : "❌";
        console.log(`│   ${icon} ${d.entity} → ${d.status} (score: ${d.score})${d.reasons.length ? ` [${d.reasons.join(", ")}]` : ""}`);
      }
      console.log(`└${"─".repeat(50)}`);
    }

    const totalInput = allReports.reduce((s, r) => s + r.inputCount, 0);
    const totalEntities = allReports.reduce((s, r) => s + r.totalEntities, 0);
    const totalReady = allReports.reduce((s, r) => s + r.entitiesReady, 0);
    const totalDraft = allReports.reduce((s, r) => s + r.entitiesDraft, 0);
    const totalDupes = allReports.reduce((s, r) => s + r.duplicatesFound, 0);

    console.log(`\n${"═".repeat(80)}`);
    console.log(`  TOTALS: ${totalInput} inputs → ${totalDupes} dupes → ${totalEntities} entities (${totalReady} ready, ${totalDraft} draft)`);
    console.log("═".repeat(80) + "\n");

    // Aggregate assertions
    expect(totalInput).toBe(12);
    expect(totalEntities).toBeLessThanOrEqual(totalInput);
    expect(totalDupes).toBeGreaterThanOrEqual(2); // Al Mallah + Atlantis
    expect(totalReady + totalDraft).toBe(totalEntities);
  });
});

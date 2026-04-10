import { describe, it, expect } from "vitest";
import { computeDedupScore, detectDuplicates, groupByDuplicates } from "../dedup/dedup-engine";
import type { SourceEntityRecord } from "../types";

function rec(id: string, overrides: Partial<SourceEntityRecord> = {}): SourceEntityRecord {
  return {
    source: "deliveroo",
    sourceEntityId: id,
    vertical: "food",
    name: "Test Restaurant",
    address: "123 Main St",
    lat: 25.2,
    lng: 55.27,
    phone: "+971501234567",
    ...overrides,
  } as SourceEntityRecord;
}

describe("Dedup Engine", () => {
  it("detects duplicate by name + geo", () => {
    const a = rec("a", { name: "Pizza Hut JLT", lat: 25.07, lng: 55.15 });
    const b = rec("b", { name: "Pizza Hut JLT", lat: 25.07, lng: 55.15, source: "talabat" });
    const match = computeDedupScore(a, b);
    expect(match).not.toBeNull();
    expect(match!.matchedOn).toContain("name");
    expect(match!.matchedOn).toContain("geo");
  });

  it("detects duplicate by name + phone", () => {
    const a = rec("a", { name: "Ravi", phone: "+971501111111", lat: 25.0, lng: 55.0 });
    const b = rec("b", { name: "Ravi", phone: "+971501111111", lat: 26.0, lng: 56.0, source: "talabat" });
    const match = computeDedupScore(a, b);
    expect(match).not.toBeNull();
    expect(match!.matchedOn).toContain("name");
    expect(match!.matchedOn).toContain("phone");
  });

  it("strips platform names from name comparison", () => {
    const a = rec("a", { name: "Al Mallah Deliveroo", source: "deliveroo" });
    const b = rec("b", { name: "Al Mallah", source: "talabat" });
    const match = computeDedupScore(a, b);
    expect(match).not.toBeNull();
    expect(match!.matchedOn).toContain("name");
  });

  it("does NOT match different entities", () => {
    const a = rec("a", { name: "Pizza Hut", lat: 25.07, lng: 55.15, phone: "+971500000001" });
    const b = rec("b", { name: "Burger King", lat: 25.20, lng: 55.30, phone: "+971500000002" });
    const match = computeDedupScore(a, b);
    expect(match).toBeNull();
  });

  it("detectDuplicates returns pairs", () => {
    const records = [
      rec("a", { name: "X", lat: 25.07, lng: 55.15 }),
      rec("b", { name: "X", lat: 25.07, lng: 55.15, source: "talabat" }),
      rec("c", { name: "Y", lat: 26.0, lng: 56.0, phone: "+97199" }),
    ];
    const matches = detectDuplicates(records);
    expect(matches.length).toBe(1);
    expect(matches[0].entityA).toBe("a");
    expect(matches[0].entityB).toBe("b");
  });

  it("groupByDuplicates merges clusters", () => {
    const records = [
      rec("a", { name: "X", lat: 25.07, lng: 55.15 }),
      rec("b", { name: "X", lat: 25.07, lng: 55.15, source: "talabat" }),
      rec("c", { name: "Y", lat: 26.0, lng: 56.0 }),
    ];
    const matches = detectDuplicates(records);
    const groups = groupByDuplicates(records, matches);
    expect(groups.length).toBe(2);
    expect(groups.find(g => g.length === 2)).toBeDefined();
    expect(groups.find(g => g.length === 1)).toBeDefined();
  });

  it("matches by website domain", () => {
    const a = rec("a", { name: "Same Place", website: "https://www.example.com/menu" });
    const b = rec("b", { name: "Same Place", website: "http://example.com", source: "google_business" });
    const match = computeDedupScore(a, b);
    expect(match).not.toBeNull();
    expect(match!.matchedOn).toContain("website");
  });
});

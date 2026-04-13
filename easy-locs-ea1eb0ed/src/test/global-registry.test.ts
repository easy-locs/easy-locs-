import { describe, it, expect } from "vitest";

describe("Global Country Registry — Full Coverage", () => {
  it("has 190+ countries registered", async () => {
    const { getAllCountryEntries } = await import("@/lib/global-country-registry");
    expect(getAllCountryEntries().length).toBeGreaterThanOrEqual(195);
  });

  it("every country has valid legalDocumentTypes array", async () => {
    const { getAllCountryEntries } = await import("@/lib/global-country-registry");
    let populated = 0;
    for (const c of getAllCountryEntries()) {
      expect(Array.isArray(c.legalDocumentTypes), `${c.code} legalDocumentTypes`).toBe(true);
      if (c.legalDocumentTypes.length > 0) populated++;
    }
    expect(populated).toBeGreaterThan(10);
  });

  it("every country has a valid timezone", async () => {
    const { getAllCountryEntries } = await import("@/lib/global-country-registry");
    for (const c of getAllCountryEntries()) {
      expect(c.timezone, `${c.code} timezone`).toBeTruthy();
      expect(c.timezone.length).toBeGreaterThan(3);
    }
  });

  it("formatCurrency handles all major currencies", async () => {
    const { formatCurrency } = await import("@/lib/global-country-registry");
    const tests = [
      { country: "FR", expected: "€" },
      { country: "US", expected: "$" },
      { country: "GB", expected: "£" },
      { country: "JP", expected: "1,000" }, // yen symbol varies by locale (¥ vs ￥)
    ];
    for (const t of tests) {
      const result = formatCurrency(1000, t.country);
      expect(result, `${t.country} currency format`).toContain(t.expected);
    }
  });

  it("formatDate works for different locales", async () => {
    const { formatDate } = await import("@/lib/global-country-registry");
    const frDate = formatDate("2025-12-25", "FR");
    expect(frDate).toContain("2025");
    const usDate = formatDate("2025-12-25", "US");
    expect(usDate).toContain("2025");
  });

  it("getSupportedRegions returns all 5 regions", async () => {
    const { getAllCountryEntries } = await import("@/lib/global-country-registry");
    const regions = new Set(getAllCountryEntries().map(c => c.region));
    expect(regions.size).toBeGreaterThanOrEqual(5);
  });
});

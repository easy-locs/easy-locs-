import { describe, it, expect } from "vitest";
import {
  generateCoreSitemap,
  generateCountriesSitemap,
  generateCitiesSitemap,
  generateSitemapIndex,
  generateSitemapEntries,
} from "@/lib/seo/sitemap-generator";

describe("Sitemap Generator", () => {
  it("generates core sitemap entries", () => {
    const entries = generateCoreSitemap();
    expect(entries.length).toBeGreaterThan(10);
    expect(entries[0].loc).toContain("easy-locs.com");
    expect(entries[0].priority).toBe("1.0");
  });

  it("generates country sitemap entries", () => {
    const entries = generateCountriesSitemap();
    expect(entries.length).toBeGreaterThan(0);
    entries.forEach(e => {
      expect(e.loc).toMatch(/easy-locs\.com\/(country\/|property-management-)/);
    });
  });

  it("generates city sitemap entries with sub-pages", () => {
    const entries = generateCitiesSitemap();
    expect(entries.length).toBeGreaterThan(0);
    const subPages = entries.filter(e => e.loc.includes("/services") || e.loc.includes("/activities") || e.loc.includes("/concierge"));
    expect(subPages.length).toBeGreaterThan(0);
  });

  it("generates valid sitemap index XML", () => {
    const xml = generateSitemapIndex();
    expect(xml).toContain('<?xml version="1.0"');
    expect(xml).toContain("<sitemapindex");
    expect(xml).toContain("sitemap-core.xml");
    expect(xml).toContain("sitemap-countries.xml");
    expect(xml).toContain("sitemap-cities.xml");
    expect(xml).toContain("sitemap-services.xml");
    expect(xml).toContain("sitemap-activities.xml");
    expect(xml).toContain("sitemap-marketplace.xml");
  });

  it("total entries count is reasonable", () => {
    const all = generateSitemapEntries();
    expect(all.length).toBeGreaterThan(50);
    expect(all.length).toBeLessThan(50000); // Google sitemap limit
  });

  it("all entries have required fields", () => {
    const all = generateSitemapEntries();
    for (const entry of all) {
      expect(entry.loc).toBeTruthy();
      expect(entry.changefreq).toBeTruthy();
      expect(entry.priority).toBeTruthy();
      expect(entry.loc).toMatch(/^https:\/\//);
    }
  });
});

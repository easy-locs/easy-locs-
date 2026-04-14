/**
 * Vite plugin to generate split sitemaps at build time.
 * Uses shared vite-seo-data.ts to ensure parity with the pre-render plugin.
 * Generates:
 *   sitemap.xml           — index pointing to sub-sitemaps
 *   sitemap-core.xml
 *   sitemap-countries.xml
 *   sitemap-cities.xml
 *   sitemap-services.xml
 *   sitemap-activities.xml
 *   sitemap-marketplace.xml
 *
 * Includes canonical dedup check at build time — fails the build if any
 * two routes produce identical canonical URLs across all sub-sitemaps.
 */
import type { Plugin } from "vite";
import {
  BUILD_SERVICE_CATEGORIES, BUILD_ACTIVITY_TYPES,
  EXTENDED_CITY_SLUGS, EXTENDED_COUNTRY_SLUGS,
  BASE_URL,
} from "./vite-seo-data";

interface SitemapEntry {
  loc: string;
  changefreq: string;
  priority: string;
  lastmod?: string;
}

export function sitemapPlugin(): any {
  return {
    name: "generate-sitemap",
    apply: "build",
    closeBundle: {
      sequential: true,
      async handler() {
        const fs = await import("fs");
        const path = await import("path");

        if (!fs.existsSync(path.resolve("dist"))) {
          console.warn("[sitemap] dist/ not found, skipping");
          return;
        }

        const today = new Date().toISOString().slice(0, 10);
        const toXml = (entries: SitemapEntry[]): string => {
          const urls = entries.map(e =>
            `  <url><loc>${e.loc}</loc><lastmod>${e.lastmod || today}</lastmod><changefreq>${e.changefreq}</changefreq><priority>${e.priority}</priority></url>`
          ).join("\n");
          return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`;
        };

        const p1CountrySlugs = EXTENDED_COUNTRY_SLUGS;
        const p1CitySlugs = EXTENDED_CITY_SLUGS;
        const serviceCategories = BUILD_SERVICE_CATEGORIES.map(s => s.slug);
        const activityTypes = BUILD_ACTIVITY_TYPES.map(a => a.slug);

        // 1. Core
        const coreEntries: SitemapEntry[] = [
          ["/", "1.0"], ["/locations", "0.9"],
          ["/property-management", "0.9"], ["/long-term-rentals", "0.9"],
          ["/seasonal-rentals", "0.9"], ["/marketplace-services", "0.9"],
          ["/concierge-services", "0.9"], ["/activities", "0.9"],
          ["/rental-management", "0.8"], ["/property-owner-software", "0.8"],
          ["/property-management-platform", "0.8"], ["/rental-management-software", "0.8"],
          ["/rentals", "0.8"], ["/services", "0.9"], ["/marketplace", "0.9"],
          ["/login", "0.4"], ["/signup", "0.5"], ["/install", "0.4"],
          ["/guest", "0.5"], ["/vision", "0.5"],
          ["/terms", "0.3"], ["/privacy", "0.3"], ["/cookies", "0.3"],
          ["/legal-notice", "0.3"], ["/about", "0.5"], ["/contact", "0.5"], ["/help", "0.5"],
        ].map(([p, prio]) => ({ loc: `${BASE_URL}${p}`, changefreq: "weekly", priority: prio as string }));

        // 2. Countries — /country/:slug only (/property-management-:slug has no App.tsx route)
        const countryEntries: SitemapEntry[] = p1CountrySlugs.map(s => ({
          loc: `${BASE_URL}/country/${s}`, changefreq: "monthly", priority: "0.8",
        }));

        // 3. Cities — city hub + sub-pages (/property-management-:slug has no App.tsx route)
        const cityEntries: SitemapEntry[] = p1CitySlugs.flatMap(s => [
          { loc: `${BASE_URL}/city/${s}`, changefreq: "weekly", priority: "0.8" },
          { loc: `${BASE_URL}/city/${s}/services`, changefreq: "monthly", priority: "0.7" },
          { loc: `${BASE_URL}/city/${s}/activities`, changefreq: "monthly", priority: "0.7" },
          { loc: `${BASE_URL}/city/${s}/concierge`, changefreq: "monthly", priority: "0.6" },
        ]);

        // 4. Services — service hubs + service×city
        // Route: /services/:service/in/:city (matches App.tsx line ~923)
        const svcHubs: SitemapEntry[] = serviceCategories.map(s => ({
          loc: `${BASE_URL}/services/${s}`, changefreq: "monthly", priority: "0.7",
        }));
        const svcCity: SitemapEntry[] = serviceCategories.flatMap(s =>
          p1CitySlugs.map(c => ({ loc: `${BASE_URL}/services/${s}/in/${c}`, changefreq: "monthly", priority: "0.6" }))
        );

        // 5. Activities — full city coverage (all phase-1 SEO cities)
        // Route: /activities/:activity/in/:city (matches App.tsx line ~924)
        const actEntries: SitemapEntry[] = activityTypes.flatMap(a =>
          p1CitySlugs.map(c => ({ loc: `${BASE_URL}/activities/${a}/in/${c}`, changefreq: "monthly", priority: "0.6" }))
        );

        // 6. Marketplace — full city coverage
        // Route: /marketplace/:citySlug/:serviceSlug (matches App.tsx line ~940, city first then service)
        const mktCity: SitemapEntry[] = p1CitySlugs.map(c => ({
          loc: `${BASE_URL}/marketplace/${c}`, changefreq: "weekly", priority: "0.7",
        }));
        const mktSvcCity: SitemapEntry[] = p1CitySlugs.flatMap(c =>
          serviceCategories.map(s => ({ loc: `${BASE_URL}/marketplace/${c}/${s}`, changefreq: "monthly", priority: "0.6" }))
        );

        const sitemaps: Record<string, SitemapEntry[]> = {
          "sitemap-core.xml": coreEntries,
          "sitemap-countries.xml": countryEntries,
          "sitemap-cities.xml": cityEntries,
          "sitemap-services.xml": [...svcHubs, ...svcCity],
          "sitemap-activities.xml": actEntries,
          "sitemap-marketplace.xml": [...mktCity, ...mktSvcCity],
        };

        // ── Canonical dedup check — fail build on duplicate canonical URLs ──
        // Checks all sitemap URL entries for duplicates (catches accidental double-entry
        // across sub-sitemaps). The prerender plugin has a separate check for its route registry.
        const allCanonicals: string[] = [];
        for (const entries of Object.values(sitemaps)) {
          for (const entry of entries) {
            allCanonicals.push(entry.loc);
          }
        }
        const seen = new Set<string>();
        const duplicates: string[] = [];
        for (const url of allCanonicals) {
          if (seen.has(url)) {
            duplicates.push(url);
          } else {
            seen.add(url);
          }
        }
        if (duplicates.length > 0) {
          const msg = `[sitemap] FATAL: ${duplicates.length} duplicate canonical URL(s) detected:\n${duplicates.slice(0, 10).map(u => `  - ${u}`).join("\n")}`;
          console.error(msg);
          throw new Error(msg);
        }
        // ── End canonical dedup check ──

        let totalUrls = 0;
        for (const [file, entries] of Object.entries(sitemaps)) {
          fs.writeFileSync(path.resolve("dist", file), toXml(entries), "utf-8");
          totalUrls += entries.length;
        }

        const indexXml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${Object.keys(sitemaps).map(f => `  <sitemap><loc>${BASE_URL}/${f}</loc><lastmod>${today}</lastmod></sitemap>`).join("\n")}
</sitemapindex>`;
        fs.writeFileSync(path.resolve("dist", "sitemap.xml"), indexXml, "utf-8");

        console.log(`[sitemap] Generated sitemap index + ${Object.keys(sitemaps).length} sub-sitemaps (${totalUrls} URLs total, ${seen.size} unique canonicals)`);
      },
    },
  };
}

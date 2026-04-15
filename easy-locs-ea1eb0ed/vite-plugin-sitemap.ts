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
 *   sitemap-guides.xml
 *   sitemap-best.xml
 *   sitemap-compare.xml
 *   sitemap-images.xml  (image sitemap with OG images per city/country)
 *   sitemap-news.xml    (news sitemap for city guides)
 *
 * Includes canonical dedup check at build time — fails the build if any
 * two routes produce identical canonical URLs across all sub-sitemaps.
 */
import type { Plugin } from "vite";
import {
  BUILD_SERVICE_CATEGORIES, BUILD_ACTIVITY_TYPES, BUILD_COUNTRIES,
  EXTENDED_CITY_SLUGS, EXTENDED_COUNTRY_SLUGS,
  BASE_URL, CONTENT_LASTMOD,
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
        ].map(([p, prio]) => ({ loc: `${BASE_URL}${p}`, changefreq: "weekly", priority: prio as string, lastmod: CONTENT_LASTMOD.core }));

        // 2. Countries — /country/:slug only (/property-management-:slug has no App.tsx route)
        const countryEntries: SitemapEntry[] = p1CountrySlugs.map(s => ({
          loc: `${BASE_URL}/country/${s}`, changefreq: "monthly", priority: "0.8", lastmod: CONTENT_LASTMOD.countries,
        }));

        // 3. Cities — city hub + sub-pages (/property-management-:slug has no App.tsx route)
        const cityEntries: SitemapEntry[] = p1CitySlugs.flatMap(s => [
          { loc: `${BASE_URL}/city/${s}`, changefreq: "weekly", priority: "0.8", lastmod: CONTENT_LASTMOD.cities },
          { loc: `${BASE_URL}/city/${s}/services`, changefreq: "monthly", priority: "0.7", lastmod: CONTENT_LASTMOD.cities },
          { loc: `${BASE_URL}/city/${s}/activities`, changefreq: "monthly", priority: "0.7", lastmod: CONTENT_LASTMOD.cities },
          { loc: `${BASE_URL}/city/${s}/concierge`, changefreq: "monthly", priority: "0.6", lastmod: CONTENT_LASTMOD.cities },
        ]);

        // 4. Services — service hubs + service×city
        // Route: /services/:service/in/:city (matches App.tsx line ~923)
        const svcHubs: SitemapEntry[] = serviceCategories.map(s => ({
          loc: `${BASE_URL}/services/${s}`, changefreq: "monthly", priority: "0.7", lastmod: CONTENT_LASTMOD.services,
        }));
        const svcCity: SitemapEntry[] = serviceCategories.flatMap(s =>
          p1CitySlugs.map(c => ({ loc: `${BASE_URL}/services/${s}/in/${c}`, changefreq: "monthly", priority: "0.6", lastmod: CONTENT_LASTMOD.services }))
        );

        // 5. Activities — full city coverage (all phase-1 SEO cities)
        // Route: /activities/:activity/in/:city (matches App.tsx line ~924)
        const actEntries: SitemapEntry[] = activityTypes.flatMap(a =>
          p1CitySlugs.map(c => ({ loc: `${BASE_URL}/activities/${a}/in/${c}`, changefreq: "monthly", priority: "0.6", lastmod: CONTENT_LASTMOD.activities }))
        );

        // 6. Marketplace — full city coverage
        // Route: /marketplace/:citySlug/:serviceSlug (matches App.tsx line ~940, city first then service)
        const mktCity: SitemapEntry[] = p1CitySlugs.map(c => ({
          loc: `${BASE_URL}/marketplace/${c}`, changefreq: "weekly", priority: "0.7", lastmod: CONTENT_LASTMOD.marketplace,
        }));
        const mktSvcCity: SitemapEntry[] = p1CitySlugs.flatMap(c =>
          serviceCategories.map(s => ({ loc: `${BASE_URL}/marketplace/${c}/${s}`, changefreq: "monthly", priority: "0.6", lastmod: CONTENT_LASTMOD.marketplace }))
        );

        // 7. Content Hub: City Guides (/guide/:city) — phase-1 cities from BUILD_COUNTRIES only
        const phase1CitySlugs = BUILD_COUNTRIES.flatMap(c => c.cities).filter(c => c.phase === 1).map(c => c.slug);
        const guideEntries: SitemapEntry[] = phase1CitySlugs.map(c => ({
          loc: `${BASE_URL}/guide/${c}`, changefreq: "weekly", priority: "0.8", lastmod: CONTENT_LASTMOD.guides,
        }));

        // 8. Content Hub: Best-of pages (/best/:service/in/:city) — top 10 phase-1 cities × top 8 services
        const topBestCities = phase1CitySlugs.slice(0, 10);
        const topBestSvcs = serviceCategories.slice(0, 8);
        const bestEntries: SitemapEntry[] = topBestSvcs.flatMap(s =>
          topBestCities.map(c => ({ loc: `${BASE_URL}/best/${s}/in/${c}`, changefreq: "monthly", priority: "0.7", lastmod: CONTENT_LASTMOD.best }))
        );

        // 9. RSS/Feed discovery
        const feedEntries: SitemapEntry[] = [
          { loc: `${BASE_URL}/feed.xml`, changefreq: "daily", priority: "0.3", lastmod: CONTENT_LASTMOD.core },
          { loc: `${BASE_URL}/feed/atom.xml`, changefreq: "daily", priority: "0.3", lastmod: CONTENT_LASTMOD.core },
          { loc: `${BASE_URL}/feed/cities.xml`, changefreq: "weekly", priority: "0.3", lastmod: CONTENT_LASTMOD.cities },
          { loc: `${BASE_URL}/feed/cities-atom.xml`, changefreq: "weekly", priority: "0.3", lastmod: CONTENT_LASTMOD.cities },
          { loc: `${BASE_URL}/feed/services.xml`, changefreq: "weekly", priority: "0.3", lastmod: CONTENT_LASTMOD.services },
          { loc: `${BASE_URL}/feed/services-atom.xml`, changefreq: "weekly", priority: "0.3", lastmod: CONTENT_LASTMOD.services },
        ];

        // 10. C2C Classifieds (Annonces)
        const annoncesEntries: SitemapEntry[] = [
          { loc: `${BASE_URL}/annonces`, changefreq: "daily", priority: "0.9", lastmod: today },
          { loc: `${BASE_URL}/annonces/recherche`, changefreq: "daily", priority: "0.8", lastmod: today },
        ];

        // 11. Content Hub: Compare pages (/compare/:service/in/:city) — same scope as best
        const compareEntries: SitemapEntry[] = topBestSvcs.flatMap(s =>
          topBestCities.map(c => ({ loc: `${BASE_URL}/compare/${s}/in/${c}`, changefreq: "monthly", priority: "0.7", lastmod: CONTENT_LASTMOD.compare }))
        );

        const sitemaps: Record<string, SitemapEntry[]> = {
          "sitemap-core.xml": [...coreEntries, ...feedEntries],
          "sitemap-countries.xml": countryEntries,
          "sitemap-cities.xml": cityEntries,
          "sitemap-services.xml": [...svcHubs, ...svcCity],
          "sitemap-activities.xml": actEntries,
          "sitemap-marketplace.xml": [...mktCity, ...mktSvcCity, ...annoncesEntries],
          "sitemap-guides.xml": guideEntries,
          "sitemap-best.xml": bestEntries,
          "sitemap-compare.xml": compareEntries,
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

        // ── Image sitemap ──
        const imageEntries = phase1CitySlugs.map(c => {
          const cityName = c.replace(/-/g, " ").replace(/\b\w/g, (ch: string) => ch.toUpperCase());
          return `  <url><loc>${BASE_URL}/city/${c}</loc><image:image><image:loc>${BASE_URL}/og/city-${c}.svg</image:loc><image:title>${cityName} — Easy-Locs</image:title></image:image></url>`;
        });
        const imageCountryEntries = BUILD_COUNTRIES.map(co =>
          `  <url><loc>${BASE_URL}/country/${co.slug}</loc><image:image><image:loc>${BASE_URL}/og/country-${co.slug}.svg</image:loc><image:title>${co.name} — Easy-Locs</image:title></image:image></url>`
        );
        const imageServiceEntries = serviceCategories.map(s => {
          const label = BUILD_SERVICE_CATEGORIES.find(sc => sc.slug === s)?.label || s.replace(/-/g, " ");
          return `  <url><loc>${BASE_URL}/services/${s}</loc><image:image><image:loc>${BASE_URL}/og/service-${s}.svg</image:loc><image:title>${label} — Easy-Locs</image:title></image:image></url>`;
        });
        const imageSvcCityEntries = serviceCategories.slice(0, 8).flatMap(s => {
          const label = BUILD_SERVICE_CATEGORIES.find(sc => sc.slug === s)?.label || s.replace(/-/g, " ");
          return phase1CitySlugs.slice(0, 10).map(c => {
            const cityName = c.replace(/-/g, " ").replace(/\b\w/g, (ch: string) => ch.toUpperCase());
            return `  <url><loc>${BASE_URL}/services/${s}/in/${c}</loc><image:image><image:loc>${BASE_URL}/og/${s}-${c}.svg</image:loc><image:title>${label} in ${cityName} — Easy-Locs</image:title></image:image></url>`;
          });
        });
        const imageSitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${[...imageEntries, ...imageCountryEntries, ...imageServiceEntries, ...imageSvcCityEntries].join("\n")}
</urlset>`;
        fs.writeFileSync(path.resolve("dist", "sitemap-images.xml"), imageSitemapXml, "utf-8");

        // ── News sitemap — city guides, marketplace updates, activity updates ──
        const newsGuideEntries = phase1CitySlugs.slice(0, 20).map(c => {
          const cityName = c.replace(/-/g, " ").replace(/\b\w/g, (ch: string) => ch.toUpperCase());
          return `  <url><loc>${BASE_URL}/guide/${c}</loc><news:news><news:publication><news:name>Easy-Locs</news:name><news:language>en</news:language></news:publication><news:publication_date>${CONTENT_LASTMOD.guides}</news:publication_date><news:title>Complete Guide to ${cityName}</news:title></news:news></url>`;
        });
        const newsMarketplaceEntries = phase1CitySlugs.slice(0, 15).map(c => {
          const cityName = c.replace(/-/g, " ").replace(/\b\w/g, (ch: string) => ch.toUpperCase());
          return `  <url><loc>${BASE_URL}/marketplace/${c}</loc><news:news><news:publication><news:name>Easy-Locs</news:name><news:language>en</news:language></news:publication><news:publication_date>${CONTENT_LASTMOD.marketplace}</news:publication_date><news:title>Marketplace Services in ${cityName}</news:title></news:news></url>`;
        });
        const newsActivityEntries = activityTypes.slice(0, 6).flatMap(a => {
          const label = BUILD_ACTIVITY_TYPES.find(at => at.slug === a)?.label || a.replace(/-/g, " ");
          return phase1CitySlugs.slice(0, 5).map(c => {
            const cityName = c.replace(/-/g, " ").replace(/\b\w/g, (ch: string) => ch.toUpperCase());
            return `  <url><loc>${BASE_URL}/activities/${a}/in/${c}</loc><news:news><news:publication><news:name>Easy-Locs</news:name><news:language>en</news:language></news:publication><news:publication_date>${CONTENT_LASTMOD.activities}</news:publication_date><news:title>${label} in ${cityName}</news:title></news:news></url>`;
          });
        });
        const allNewsEntries = [...newsGuideEntries, ...newsMarketplaceEntries, ...newsActivityEntries];
        const newsSitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${allNewsEntries.join("\n")}
</urlset>`;
        fs.writeFileSync(path.resolve("dist", "sitemap-news.xml"), newsSitemapXml, "utf-8");

        const sitemapLastmods: Record<string, string> = {
          "sitemap-core.xml": CONTENT_LASTMOD.core,
          "sitemap-countries.xml": CONTENT_LASTMOD.countries,
          "sitemap-cities.xml": CONTENT_LASTMOD.cities,
          "sitemap-services.xml": CONTENT_LASTMOD.services,
          "sitemap-activities.xml": CONTENT_LASTMOD.activities,
          "sitemap-marketplace.xml": CONTENT_LASTMOD.marketplace,
          "sitemap-guides.xml": CONTENT_LASTMOD.guides,
          "sitemap-best.xml": CONTENT_LASTMOD.best,
          "sitemap-compare.xml": CONTENT_LASTMOD.compare,
          "sitemap-images.xml": CONTENT_LASTMOD.images,
          "sitemap-news.xml": CONTENT_LASTMOD.news,
        };
        const allSitemapFiles = [...Object.keys(sitemaps), "sitemap-images.xml", "sitemap-news.xml"];
        const indexXml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allSitemapFiles.map(f => `  <sitemap><loc>${BASE_URL}/${f}</loc><lastmod>${sitemapLastmods[f] || today}</lastmod></sitemap>`).join("\n")}
</sitemapindex>`;
        fs.writeFileSync(path.resolve("dist", "sitemap.xml"), indexXml, "utf-8");

        console.log(`[sitemap] Generated sitemap index + ${allSitemapFiles.length} sub-sitemaps (${totalUrls} URLs total, ${seen.size} unique canonicals, +image/news sitemaps)`);
      },
    },
  };
}

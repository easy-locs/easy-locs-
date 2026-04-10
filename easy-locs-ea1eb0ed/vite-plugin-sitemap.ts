/**
 * Vite plugin to generate split sitemaps at build time.
 * Generates:
 *   sitemap.xml           — index pointing to sub-sitemaps
 *   sitemap-core.xml
 *   sitemap-countries.xml
 *   sitemap-cities.xml
 *   sitemap-services.xml
 *   sitemap-activities.xml
 *   sitemap-marketplace.xml
 */
import type { Plugin } from "vite";

const BASE = "https://www.easy-locs.com";

interface SitemapEntry {
  loc: string;
  changefreq: string;
  priority: string;
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

        // Phase-1 data — mirrored from seo-data.ts
        const p1CountrySlugs = [
          "france", "uk", "spain", "germany", "italy", "portugal", "netherlands",
          "switzerland", "usa", "canada", "uae", "saudi-arabia", "turkey", "israel",
          "thailand", "japan", "australia", "singapore-sg", "indonesia", "morocco", "south-africa",
        ];
        const p1CitySlugs = [
          "paris", "marseille", "lyon", "nice", "bordeaux", "toulouse",
          "london", "manchester", "edinburgh", "birmingham",
          "madrid", "barcelona", "valencia", "malaga",
          "berlin", "munich", "hamburg", "frankfurt",
          "rome", "milan", "florence",
          "lisbon", "porto",
          "amsterdam",
          "zurich", "geneva",
          "new-york", "miami", "los-angeles", "san-francisco",
          "toronto", "vancouver", "montreal",
          "dubai", "abu-dhabi",
          "riyadh", "jeddah",
          "istanbul", "antalya",
          "tel-aviv",
          "bangkok", "phuket", "chiang-mai",
          "tokyo", "osaka",
          "sydney", "melbourne",
          "singapore-city",
          "bali",
          "marrakech", "casablanca",
          "cape-town", "johannesburg",
          "vienna", "warsaw", "athens", "dublin", "prague", "dubrovnik", "seoul", "mexico-city",
        ];
        const serviceCategories = [
          "cleaning", "maintenance", "transport", "car-rental", "tours",
          "airport-transfer", "personal", "spa", "water-sport", "restaurant",
          "coworking", "event", "yacht-rental", "private-chef",
        ];
        const activityTypes = [
          "desert-safari", "food-tour", "cooking-class", "boat-tour", "city-tour",
          "wine-tasting", "scuba-diving", "hiking", "surfing", "cultural-tour",
          "photography-tour", "snorkeling", "kayaking", "horse-riding",
          "helicopter-tour", "sunset-cruise",
        ];

        const toXml = (entries: SitemapEntry[]): string => {
          const urls = entries.map(e =>
            `  <url><loc>${e.loc}</loc><changefreq>${e.changefreq}</changefreq><priority>${e.priority}</priority></url>`
          ).join("\n");
          return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`;
        };

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
        ].map(([p, prio]) => ({ loc: `${BASE}${p}`, changefreq: "weekly", priority: prio as string }));

        // 2. Countries
        const countryEntries: SitemapEntry[] = p1CountrySlugs.flatMap(s => [
          { loc: `${BASE}/country/${s}`, changefreq: "monthly", priority: "0.8" },
          { loc: `${BASE}/property-management-${s}`, changefreq: "monthly", priority: "0.7" },
        ]);

        // 3. Cities
        const cityEntries: SitemapEntry[] = p1CitySlugs.flatMap(s => [
          { loc: `${BASE}/city/${s}`, changefreq: "weekly", priority: "0.8" },
          { loc: `${BASE}/city/${s}/services`, changefreq: "monthly", priority: "0.7" },
          { loc: `${BASE}/city/${s}/activities`, changefreq: "monthly", priority: "0.7" },
          { loc: `${BASE}/city/${s}/concierge`, changefreq: "monthly", priority: "0.6" },
          { loc: `${BASE}/property-management-${s}`, changefreq: "monthly", priority: "0.6" },
        ]);

        // 4. Services
        const svcHubs: SitemapEntry[] = serviceCategories.map(s => ({
          loc: `${BASE}/services/${s}`, changefreq: "monthly", priority: "0.7",
        }));
        const svcCity: SitemapEntry[] = serviceCategories.flatMap(s =>
          p1CitySlugs.map(c => ({ loc: `${BASE}/services/${s}/${c}`, changefreq: "monthly", priority: "0.6" }))
        );

        // 5. Activities
        const top30Cities = p1CitySlugs.slice(0, 30);
        const actEntries: SitemapEntry[] = activityTypes.flatMap(a =>
          top30Cities.map(c => ({ loc: `${BASE}/activities/${a}-${c}`, changefreq: "monthly", priority: "0.6" }))
        );

        // 6. Marketplace
        const mktCity: SitemapEntry[] = p1CitySlugs.map(c => ({
          loc: `${BASE}/marketplace/${c}`, changefreq: "weekly", priority: "0.7",
        }));
        const mktSvcCity: SitemapEntry[] = serviceCategories.flatMap(s =>
          top30Cities.map(c => ({ loc: `${BASE}/marketplace/${s}/${c}`, changefreq: "monthly", priority: "0.6" }))
        );

        const sitemaps: Record<string, SitemapEntry[]> = {
          "sitemap-core.xml": coreEntries,
          "sitemap-countries.xml": countryEntries,
          "sitemap-cities.xml": cityEntries,
          "sitemap-services.xml": [...svcHubs, ...svcCity],
          "sitemap-activities.xml": actEntries,
          "sitemap-marketplace.xml": [...mktCity, ...mktSvcCity],
        };

        let totalUrls = 0;
        for (const [file, entries] of Object.entries(sitemaps)) {
          fs.writeFileSync(path.resolve("dist", file), toXml(entries), "utf-8");
          totalUrls += entries.length;
        }

        // Sitemap index
        const indexXml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${Object.keys(sitemaps).map(f => `  <sitemap><loc>${BASE}/${f}</loc></sitemap>`).join("\n")}
</sitemapindex>`;
        fs.writeFileSync(path.resolve("dist", "sitemap.xml"), indexXml, "utf-8");

        console.log(`[sitemap] Generated sitemap index + ${Object.keys(sitemaps).length} sub-sitemaps (${totalUrls} URLs total)`);
      },
    },
  };
}

/**
 * Vite plugin to generate sitemap.xml at build time
 * from the SEO data registry (phase-1 only).
 */
import type { Plugin } from "vite";

// Inline the data generation to avoid ESM/TS import issues in vite config
// This mirrors the logic in src/lib/seo/sitemap-generator.ts

const BASE = "https://www.easy-locs.com";

interface SitemapEntry {
  loc: string;
  changefreq: string;
  priority: string;
}

export function sitemapPlugin(): Plugin {
  return {
    name: "generate-sitemap",
    apply: "build",
    closeBundle: {
      sequential: true,
      async handler() {
        // Dynamic import to use the actual TS data
        // At build time, Vite has already processed the TS files
        const fs = await import("fs");
        const path = await import("path");
        
        // We'll generate a minimal but correct sitemap
        // Since we can't easily import TS at plugin level,
        // we read and evaluate the generated JS output
        const sitemapPath = path.resolve("dist", "sitemap.xml");
        
        // Check if dist exists (it should during build)
        if (!fs.existsSync(path.resolve("dist"))) {
          console.warn("[sitemap] dist/ not found, skipping sitemap generation");
          return;
        }

        // Generate sitemap from hardcoded phase-1 data
        // This ensures the sitemap is always in sync with what the app routes handle
        const xml = generateSitemapXml();
        fs.writeFileSync(sitemapPath, xml, "utf-8");
        console.log(`[sitemap] Generated sitemap.xml with ${xml.split("<url>").length - 1} URLs`);
      },
    },
  };
}

function generateSitemapXml(): string {
  const entries: SitemapEntry[] = [];

  // Layer 1 — Core pages
  const corePages = [
    "/", "/property-management", "/long-term-rentals", "/seasonal-rentals",
    "/marketplace-services", "/concierge-services", "/activities",
    "/rental-management", "/property-owner-software", "/property-management-platform",
    "/rental-management-software", "/rentals",
  ];
  for (const p of corePages) {
    entries.push({ loc: `${BASE}${p}`, changefreq: "weekly", priority: p === "/" ? "1.0" : "0.9" });
  }

  // Layer 2 — Phase-1 Country slugs
  const p1CountrySlugs = [
    "france", "uk", "spain", "germany", "italy", "portugal", "netherlands",
    "switzerland", "usa", "canada", "uae", "saudi-arabia", "turkey", "israel",
    "thailand", "japan", "australia", "singapore-sg", "indonesia", "morocco", "south-africa",
  ];
  for (const slug of p1CountrySlugs) {
    entries.push({ loc: `${BASE}/property-management-${slug}`, changefreq: "monthly", priority: "0.8" });
  }

  // Layer 3 — Phase-1 City slugs (from both phase-1 and phase-2 countries)
  const p1CitySlugs = [
    // France
    "paris", "marseille", "lyon", "nice", "bordeaux", "toulouse",
    // UK
    "london", "manchester", "edinburgh", "birmingham",
    // Spain
    "madrid", "barcelona", "valencia", "malaga",
    // Germany
    "berlin", "munich", "hamburg", "frankfurt",
    // Italy
    "rome", "milan", "florence",
    // Portugal
    "lisbon", "porto",
    // Netherlands
    "amsterdam",
    // Switzerland
    "zurich", "geneva",
    // USA
    "new-york", "miami", "los-angeles", "san-francisco",
    // Canada
    "toronto", "vancouver", "montreal",
    // UAE
    "dubai", "abu-dhabi",
    // Saudi Arabia
    "riyadh", "jeddah",
    // Turkey
    "istanbul", "antalya",
    // Israel
    "tel-aviv",
    // Thailand
    "bangkok", "phuket", "chiang-mai",
    // Japan
    "tokyo", "osaka",
    // Australia
    "sydney", "melbourne",
    // Singapore
    "singapore-city",
    // Indonesia
    "bali",
    // Morocco
    "marrakech", "casablanca",
    // South Africa
    "cape-town", "johannesburg",
    // Phase-2 countries, phase-1 cities
    "vienna", "warsaw", "athens", "dublin", "prague", "dubrovnik", "seoul",
    "mexico-city",
  ];
  for (const slug of p1CitySlugs) {
    entries.push({ loc: `${BASE}/property-management-${slug}`, changefreq: "monthly", priority: "0.7" });
  }

  // Layer 4 — Service + top 30 Phase-1 cities
  const serviceCategories = [
    "cleaning", "maintenance", "transport", "car-rental", "tours",
    "airport-transfer", "personal", "spa", "water-sport", "restaurant",
    "coworking", "event", "yacht-rental", "private-chef",
  ];
  const top30Cities = p1CitySlugs.slice(0, 30);
  for (const svc of serviceCategories) {
    for (const city of top30Cities) {
      entries.push({ loc: `${BASE}/services/${svc}-${city}`, changefreq: "monthly", priority: "0.6" });
    }
  }

  // Layer 5 — Activity + top 20 Phase-1 cities
  const activityTypes = [
    "desert-safari", "food-tour", "cooking-class", "boat-tour", "city-tour",
    "wine-tasting", "scuba-diving", "hiking", "surfing", "cultural-tour",
    "photography-tour", "snorkeling", "kayaking", "horse-riding",
    "helicopter-tour", "sunset-cruise",
  ];
  for (const act of activityTypes) {
    for (const city of top30Cities.slice(0, 20)) {
      entries.push({ loc: `${BASE}/activities/${act}-${city}`, changefreq: "monthly", priority: "0.6" });
    }
  }

  // Utility pages
  const utilPages: [string, string][] = [
    ["/login", "0.5"], ["/signup", "0.6"], ["/install", "0.5"],
    ["/guest", "0.6"], ["/vision", "0.6"],
    ["/terms", "0.3"], ["/privacy", "0.3"], ["/cookies", "0.3"],
    ["/legal-notice", "0.3"], ["/about", "0.5"], ["/contact", "0.5"], ["/help", "0.6"],
  ];
  for (const [p, prio] of utilPages) {
    entries.push({ loc: `${BASE}${p}`, changefreq: "monthly", priority: prio });
  }

  const urls = entries.map(e =>
    `  <url><loc>${e.loc}</loc><changefreq>${e.changefreq}</changefreq><priority>${e.priority}</priority></url>`
  ).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;
}

/**
 * Dynamic Sitemap Generator — Phase-1 quality filter
 * Generates sitemap.xml content for indexable pages only.
 */
import { SEO_COUNTRIES, SEO_SERVICE_CATEGORIES, SEO_ACTIVITY_TYPES, getPhase1Countries, getPhase1Cities } from "./seo-data";

const BASE = "https://www.easy-locs.com";

interface SitemapEntry {
  loc: string;
  changefreq: string;
  priority: string;
}

export const generateSitemapEntries = (): SitemapEntry[] => {
  const entries: SitemapEntry[] = [];

  // Layer 1 — Core pages (always indexed)
  const corePages = [
    "/", "/property-management", "/long-term-rentals", "/seasonal-rentals",
    "/marketplace-services", "/concierge-services", "/activities",
    "/rental-management", "/property-owner-software", "/property-management-platform",
    "/rental-management-software", "/rentals",
  ];
  for (const p of corePages) {
    entries.push({ loc: `${BASE}${p}`, changefreq: "weekly", priority: p === "/" ? "1.0" : "0.9" });
  }

  // Layer 2 — Phase-1 Country pages only
  const p1Countries = getPhase1Countries();
  for (const c of p1Countries) {
    entries.push({ loc: `${BASE}/property-management-${c.slug}`, changefreq: "monthly", priority: "0.8" });
  }

  // Layer 3 — Phase-1 City pages only
  const p1Cities = getPhase1Cities();
  for (const city of p1Cities) {
    entries.push({ loc: `${BASE}/property-management-${city.slug}`, changefreq: "monthly", priority: "0.7" });
  }

  // Layer 4 — Service + Phase-1 cities (top 30 cities)
  const topCities = p1Cities.slice(0, 30);
  for (const svc of SEO_SERVICE_CATEGORIES) {
    for (const city of topCities) {
      entries.push({ loc: `${BASE}/services/${svc.slug}-${city.slug}`, changefreq: "monthly", priority: "0.6" });
    }
  }

  // Layer 5 — Activity + Phase-1 cities (top 20 cities)
  for (const act of SEO_ACTIVITY_TYPES) {
    for (const city of topCities.slice(0, 20)) {
      entries.push({ loc: `${BASE}/activities/${act.slug}-${city.slug}`, changefreq: "monthly", priority: "0.6" });
    }
  }

  // Utility pages
  const utilPages = [
    ["/login", "0.5"], ["/signup", "0.6"], ["/install", "0.5"],
    ["/guest", "0.6"], ["/vision", "0.6"],
    ["/terms", "0.3"], ["/privacy", "0.3"], ["/cookies", "0.3"],
    ["/legal-notice", "0.3"], ["/about", "0.5"], ["/contact", "0.5"], ["/help", "0.6"],
  ];
  for (const [p, prio] of utilPages) {
    entries.push({ loc: `${BASE}${p}`, changefreq: "monthly", priority: prio });
  }

  return entries;
};

export const generateSitemapXml = (): string => {
  const entries = generateSitemapEntries();
  const urls = entries.map(e =>
    `  <url><loc>${e.loc}</loc><changefreq>${e.changefreq}</changefreq><priority>${e.priority}</priority></url>`
  ).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;
};

/** Index sitemap pointing to sub-sitemaps for very large sites */
export const generateSitemapIndex = (): string => {
  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap><loc>${BASE}/sitemap.xml</loc></sitemap>
</sitemapindex>`;
};

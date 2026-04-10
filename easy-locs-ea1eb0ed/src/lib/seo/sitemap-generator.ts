/**
 * Dynamic Sitemap Generator — Split sitemaps for massive programmatic SEO.
 * Generates:
 *   /sitemap.xml          — sitemap index pointing to sub-sitemaps
 *   /sitemap-core.xml     — static core pages
 *   /sitemap-countries.xml — country hub pages
 *   /sitemap-cities.xml   — city hub + sub-pages
 *   /sitemap-services.xml — service × city combinations
 *   /sitemap-activities.xml — activity × city combinations
 *   /sitemap-marketplace.xml — marketplace pages
 */
import { SEO_COUNTRIES, SEO_SERVICE_CATEGORIES, SEO_ACTIVITY_TYPES, getPhase1Countries, getPhase1Cities, getAllCities } from "./seo-data";

const BASE = "https://www.easy-locs.com";

interface SitemapEntry {
  loc: string;
  changefreq: string;
  priority: string;
}

// ─── CORE PAGES ──────────────────────────────
export const generateCoreSitemap = (): SitemapEntry[] => {
  const pages = [
    ["/", "1.0"], ["/locations", "0.9"],
    ["/property-management", "0.9"], ["/long-term-rentals", "0.9"],
    ["/seasonal-rentals", "0.9"], ["/marketplace-services", "0.9"],
    ["/concierge-services", "0.9"], ["/activities", "0.9"],
    ["/rental-management", "0.8"], ["/property-owner-software", "0.8"],
    ["/property-management-platform", "0.8"], ["/rental-management-software", "0.8"],
    ["/rentals", "0.8"], ["/services", "0.9"], ["/marketplace", "0.9"], ["/explore", "0.9"],
    ["/login", "0.4"], ["/signup", "0.5"], ["/install", "0.4"],
    ["/guest", "0.5"], ["/vision", "0.5"],
    ["/terms", "0.3"], ["/privacy", "0.3"], ["/cookies", "0.3"],
    ["/legal-notice", "0.3"], ["/about", "0.5"], ["/contact", "0.5"], ["/help", "0.5"],
  ];
  return pages.map(([p, prio]) => ({ loc: `${BASE}${p}`, changefreq: "weekly", priority: prio }));
};

// ─── COUNTRY PAGES ──────────────────────────────
export const generateCountriesSitemap = (): SitemapEntry[] => {
  const entries: SitemapEntry[] = [];
  for (const c of getPhase1Countries()) {
    entries.push({ loc: `${BASE}/country/${c.slug}`, changefreq: "monthly", priority: "0.8" });
    // Legacy property-management-{country}
    entries.push({ loc: `${BASE}/property-management-${c.slug}`, changefreq: "monthly", priority: "0.7" });
  }
  return entries;
};

// ─── CITY PAGES ──────────────────────────────
export const generateCitiesSitemap = (): SitemapEntry[] => {
  const entries: SitemapEntry[] = [];
  for (const city of getPhase1Cities()) {
    // Main city hub
    entries.push({ loc: `${BASE}/city/${city.slug}`, changefreq: "weekly", priority: "0.8" });
    // Sub-pages
    entries.push({ loc: `${BASE}/city/${city.slug}/services`, changefreq: "monthly", priority: "0.7" });
    entries.push({ loc: `${BASE}/city/${city.slug}/activities`, changefreq: "monthly", priority: "0.7" });
    entries.push({ loc: `${BASE}/city/${city.slug}/concierge`, changefreq: "monthly", priority: "0.6" });
    // Legacy
    entries.push({ loc: `${BASE}/property-management-${city.slug}`, changefreq: "monthly", priority: "0.6" });
  }
  return entries;
};

// ─── SERVICES PAGES ──────────────────────────────
export const generateServicesSitemap = (): SitemapEntry[] => {
  const entries: SitemapEntry[] = [];
  // Service category hubs
  for (const svc of SEO_SERVICE_CATEGORIES) {
    entries.push({ loc: `${BASE}/services/${svc.slug}`, changefreq: "monthly", priority: "0.7" });
  }
  // Service × city (phase-1 cities only)
  const cities = getPhase1Cities();
  for (const svc of SEO_SERVICE_CATEGORIES) {
    for (const city of cities) {
      entries.push({ loc: `${BASE}/services/${svc.slug}/${city.slug}`, changefreq: "monthly", priority: "0.6" });
    }
  }
  return entries;
};

// ─── ACTIVITIES PAGES ──────────────────────────────
export const generateActivitiesSitemap = (): SitemapEntry[] => {
  const entries: SitemapEntry[] = [];
  const cities = getPhase1Cities().slice(0, 30); // Top 30 cities
  for (const act of SEO_ACTIVITY_TYPES) {
    for (const city of cities) {
      entries.push({ loc: `${BASE}/activities/${act.slug}-${city.slug}`, changefreq: "monthly", priority: "0.6" });
    }
  }
  return entries;
};

// ─── MARKETPLACE PAGES ──────────────────────────────
export const generateMarketplaceSitemap = (): SitemapEntry[] => {
  const entries: SitemapEntry[] = [];
  const cities = getPhase1Cities();
  // City marketplace hubs
  for (const city of cities) {
    entries.push({ loc: `${BASE}/marketplace/${city.slug}`, changefreq: "weekly", priority: "0.7" });
  }
  // Service × city marketplace (top 30 cities)
  for (const svc of SEO_SERVICE_CATEGORIES) {
    for (const city of cities.slice(0, 30)) {
      entries.push({ loc: `${BASE}/marketplace/${svc.slug}/${city.slug}`, changefreq: "monthly", priority: "0.6" });
    }
  }
  return entries;
};

// ─── SHOPS & STOREFRONTS ──────────────────────────────
export const generateShopsSitemap = (): SitemapEntry[] => {
  const entries: SitemapEntry[] = [];
  const verticals = ["food", "grocery", "shops", "services", "beauty", "coffee", "health", "fitness"];
  const cities = getPhase1Cities();
  for (const v of verticals) {
    entries.push({ loc: `${BASE}/browse/${v}`, changefreq: "daily", priority: "0.8" });
    for (const city of cities.slice(0, 30)) {
      entries.push({ loc: `${BASE}/browse/${v}/${city.slug}`, changefreq: "daily", priority: "0.7" });
    }
  }
  entries.push({ loc: `${BASE}/food`, changefreq: "daily", priority: "0.9" });
  entries.push({ loc: `${BASE}/marketplace`, changefreq: "daily", priority: "0.9" });
  entries.push({ loc: `${BASE}/explore`, changefreq: "daily", priority: "0.9" });
  return entries;
};

// ─── XML GENERATORS ──────────────────────────────
const toXml = (entries: SitemapEntry[]): string => {
  const urls = entries.map(e =>
    `  <url><loc>${e.loc}</loc><changefreq>${e.changefreq}</changefreq><priority>${e.priority}</priority></url>`
  ).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;
};

/** Generate a specific sub-sitemap XML */
export const generateSubSitemapXml = (type: "core" | "countries" | "cities" | "services" | "activities" | "marketplace" | "shops"): string => {
  const generators: Record<string, () => SitemapEntry[]> = {
    core: generateCoreSitemap,
    countries: generateCountriesSitemap,
    cities: generateCitiesSitemap,
    services: generateServicesSitemap,
    activities: generateActivitiesSitemap,
    marketplace: generateMarketplaceSitemap,
    shops: generateShopsSitemap,
  };
  return toXml(generators[type]());
};

/** Generate the sitemap index XML */
export const generateSitemapIndex = (): string => {
  const sitemaps = ["core", "countries", "cities", "services", "activities", "marketplace", "shops"];
  const entries = sitemaps.map(s =>
    `  <sitemap><loc>${BASE}/sitemap-${s}.xml</loc></sitemap>`
  ).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</sitemapindex>`;
};

/** Legacy: Generate a single flat sitemap (all entries combined) */
export const generateSitemapXml = (): string => {
  const all = [
    ...generateCoreSitemap(),
    ...generateCountriesSitemap(),
    ...generateCitiesSitemap(),
    ...generateServicesSitemap(),
    ...generateActivitiesSitemap(),
    ...generateMarketplaceSitemap(),
    ...generateShopsSitemap(),
  ];
  return toXml(all);
};

/** All entries for counting */
export const generateSitemapEntries = (): SitemapEntry[] => [
  ...generateCoreSitemap(),
  ...generateCountriesSitemap(),
  ...generateCitiesSitemap(),
  ...generateServicesSitemap(),
  ...generateActivitiesSitemap(),
  ...generateMarketplaceSitemap(),
  ...generateShopsSitemap(),
];

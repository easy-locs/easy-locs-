/**
 * vite-plugin-prerender.ts
 * Generates static HTML files for all SEO landing page routes at build time.
 *
 * Each file is built from the SPA index.html with:
 *   1. Route-specific <head> meta (title, description, canonical, og:image, hreflang, JSON-LD)
 *   2. Pre-rendered <body> content: real H1, city/country text, internal link grids, FAQ —
 *      so crawlers see full indexable HTML before JS hydration.
 *
 * Hreflang strategy: single-URL multilingual SPA (no locale-prefixed URLs).
 *   All locales (en/fr/ar) + x-default point to the same canonical per Google's guidance
 *   for monolingual-URL multilingual SPAs. The UI language adapts via navigator.language.
 *
 * Compatible with Vite + React SPA — no Next.js/Remix migration required.
 */

import type { Plugin } from "vite";
import * as fs from "node:fs";
import * as path from "node:path";
import {
  BUILD_SERVICE_CATEGORIES, BUILD_ACTIVITY_TYPES, BUILD_COUNTRIES,
  getBuildPhase1Cities, getBuildPhase1Countries, getBuildCityBySlug, getBuildCountryBySlug,
  EXTENDED_CITY_SLUGS, EXTENDED_COUNTRY_SLUGS, BASE_URL, getProviderCount,
  type BuildCity, type BuildCountry, type BuildService, type BuildActivity,
} from "./vite-seo-data";

const DEFAULT_OG_IMAGE = `${BASE_URL}/og-default.jpg`;

// ── Hreflang ──────────────────────────────────────────────────────────────────
// Single-URL multilingual SPA: all locales share the same canonical URL.
// Full locale set mirrors SUPPORTED_LOCALES in src/lib/i18n-advanced.ts.
// x-default points to the canonical (en) URL per Google spec.
const HREFLANG_LOCALES = [
  "fr", "en", "es", "de", "pt", "it", "nl", "ar", "he", "fa",
  "tr", "pl", "ro", "cs", "sv", "da", "fi", "nb", "el", "hu",
  "bg", "hr", "sk", "sl", "et", "lv", "lt", "uk", "ru", "ja", "zh",
  "hi", "bn", "sw", "th", "vi", "id", "ms", "ko", "tl", "ur",
  "am", "ha", "yo", "wo",
  "x-default",
] as const;

function buildHreflangLinks(canonicalUrl: string): string {
  return HREFLANG_LOCALES
    .map(lang => `  <link rel="alternate" hreflang="${lang}" href="${canonicalUrl}" />`)
    .join("\n");
}

// ── Head meta builder ─────────────────────────────────────────────────────────
interface HeadMeta {
  title: string;
  description: string;
  canonical: string;
  ogImage?: string;
  jsonLd?: object;
}

function buildHeadMeta(m: HeadMeta): string {
  const img = m.ogImage || DEFAULT_OG_IMAGE;
  const jsonLdTag = m.jsonLd
    ? `  <script type="application/ld+json">${JSON.stringify(m.jsonLd)}</script>`
    : "";

  return [
    `  <title>${esc(m.title)}</title>`,
    `  <meta name="description" content="${esc155(m.description)}" />`,
    `  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />`,
    `  <link rel="canonical" href="${m.canonical}" />`,
    `  <meta property="og:title" content="${esc(m.title)}" />`,
    `  <meta property="og:description" content="${esc155(m.description)}" />`,
    `  <meta property="og:url" content="${m.canonical}" />`,
    `  <meta property="og:image" content="${img}" />`,
    `  <meta property="og:image:width" content="1200" />`,
    `  <meta property="og:image:height" content="630" />`,
    `  <meta property="og:type" content="website" />`,
    `  <meta property="og:site_name" content="Easy-Locs" />`,
    `  <meta name="twitter:card" content="summary_large_image" />`,
    `  <meta name="twitter:title" content="${esc(m.title)}" />`,
    `  <meta name="twitter:description" content="${esc155(m.description)}" />`,
    `  <meta name="twitter:image" content="${img}" />`,
    `  <meta name="twitter:site" content="@easylocs" />`,
    buildHreflangLinks(m.canonical),
    jsonLdTag,
  ].filter(Boolean).join("\n");
}

// ── Body content builders ─────────────────────────────────────────────────────

function breadcrumbHtml(items: Array<{ name: string; href?: string }>): string {
  const crumbs = items.map((item, i) => {
    const isLast = i === items.length - 1;
    const inner = isLast || !item.href
      ? `<span aria-current="page">${esc(item.name)}</span>`
      : `<a href="${item.href}">${esc(item.name)}</a>`;
    const sep = i > 0 ? `<span aria-hidden="true"> › </span>` : "";
    return `<li>${sep}${inner}</li>`;
  }).join("");
  return `<nav aria-label="Breadcrumb" class="seo-breadcrumb"><ol>${crumbs}</ol></nav>`;
}

function serviceLinkGrid(citySlug: string, services: typeof BUILD_SERVICE_CATEGORIES, heading: string): string {
  const links = services
    .map(s => `<li><a href="${BASE_URL}/services/${s.slug}/in/${citySlug}">${esc(s.label)}</a></li>`)
    .join("");
  return `<section class="seo-section"><h2>${esc(heading)}</h2><ul class="seo-grid">${links}</ul></section>`;
}

function activityLinkGrid(citySlug: string, activities: typeof BUILD_ACTIVITY_TYPES, heading: string): string {
  const links = activities
    .slice(0, 12)
    .map(a => `<li><a href="${BASE_URL}/activities/${a.slug}/in/${citySlug}">${esc(a.label)}</a></li>`)
    .join("");
  return `<section class="seo-section"><h2>${esc(heading)}</h2><ul class="seo-grid">${links}</ul></section>`;
}

function faqHtml(faqs: Array<{ q: string; a: string }>): string {
  const items = faqs.map(f =>
    `<dt>${esc(f.q)}</dt><dd>${esc(f.a)}</dd>`
  ).join("");
  return `<section class="seo-section"><h2>Frequently Asked Questions</h2><dl class="seo-faq">${items}</dl></section>`;
}

// ── Data-driven enrichment helpers ────────────────────────────────────────────

/** Stats row: data-backed provider count from vite-seo-data.getProviderCount, service counts */
function statsBlock(city: BuildCity, serviceSlug?: string, serviceLabel?: string): string {
  const count = getProviderCount(city.slug, serviceSlug);
  const subject = serviceLabel ? `${serviceLabel} providers` : "local providers";
  return [
    `<section class="seo-stats" aria-label="Key metrics">`,
    `<ul class="seo-stats-list">`,
    `<li><strong>${count}</strong> verified ${esc(subject)} in ${esc(city.name)}</li>`,
    `<li><strong>${BUILD_SERVICE_CATEGORIES.length}</strong> service categories available</li>`,
    `<li><strong>${BUILD_ACTIVITY_TYPES.length}</strong> activity types bookable</li>`,
    `<li>Instant booking · No booking fee · Rated & reviewed</li>`,
    `</ul>`,
    `</section>`,
  ].join("\n");
}

function cityBodyHtml(city: BuildCity, country: BuildCountry, subPage: "overview" | "services" | "activities" | "concierge" = "overview"): string {
  const cityLink = `${BASE_URL}/city/${city.slug}`;
  const crumbs = [
    { name: "Easy-Locs", href: BASE_URL },
    { name: "Locations", href: `${BASE_URL}/locations` },
    { name: `${country.flag} ${country.name}`, href: `${BASE_URL}/country/${country.slug}` },
    ...(subPage === "overview"
      ? [{ name: city.name }]
      : [{ name: city.name, href: cityLink }, { name: subPage.charAt(0).toUpperCase() + subPage.slice(1) }]),
  ];

  const h1Map = {
    overview: city.name,
    services: `Services in ${city.name}`,
    activities: `Things to Do in ${city.name}`,
    concierge: `Concierge Services in ${city.name}`,
  };

  const intro = `<section class="seo-hero"><h1>${esc(h1Map[subPage])}</h1><p>${esc(city.localContext)}</p></section>`;

  const siblingsCountry = BUILD_COUNTRIES
    .find(c => c.slug === country.slug)
    ?.cities
    .filter(c => c.slug !== city.slug && c.phase === 1)
    .slice(0, 8)
    .map(c => `<li><a href="${BASE_URL}/city/${c.slug}">${esc(c.name)}</a></li>`)
    .join("") || "";
  const siblingsSection = siblingsCountry
    ? `<section class="seo-section"><h2>Other Cities in ${esc(country.name)}</h2><ul class="seo-grid">${siblingsCountry}</ul></section>`
    : "";

  const faqs = [
    { q: `What services are available in ${city.name}?`, a: `Easy-Locs offers ${BUILD_SERVICE_CATEGORIES.length}+ service categories in ${city.name} including cleaning, maintenance, transport, tours, and more. All bookable online with local providers.` },
    { q: `What is the rental market like in ${city.name}?`, a: city.localContext },
    { q: `Can I book activities in ${city.name}?`, a: `Yes. Browse tours, experiences, and activities in ${city.name} from local providers. Book online with transparent pricing in ${country.currency}.` },
    { q: `How do I find a property manager in ${city.name}?`, a: `Search our marketplace for property management services in ${city.name}. Compare providers, read reviews, and book directly.` },
  ];

  const nav = `<nav class="seo-subnav">
    <a href="${BASE_URL}/city/${city.slug}">Overview</a>
    <a href="${BASE_URL}/city/${city.slug}/services">Services</a>
    <a href="${BASE_URL}/city/${city.slug}/activities">Activities</a>
    <a href="${BASE_URL}/city/${city.slug}/concierge">Concierge</a>
    <a href="${BASE_URL}/marketplace/${city.slug}">Marketplace</a>
  </nav>`;

  const ctaSection = `<section class="seo-cta"><p>Easy-Locs connects property owners, guests, and service providers in ${esc(city.name)}. Manage rentals, book services, and discover local experiences — all from one platform.</p><a href="${BASE_URL}/signup">Get started in ${esc(city.name)} — it's free</a></section>`;

  return [
    `<div id="seo-prerender">`,
    breadcrumbHtml(crumbs),
    intro,
    nav,
    subPage !== "activities" ? serviceLinkGrid(city.slug, BUILD_SERVICE_CATEGORIES, `Services in ${city.name}`) : "",
    subPage !== "services" ? activityLinkGrid(city.slug, BUILD_ACTIVITY_TYPES, `Activities & Things to Do in ${city.name}`) : "",
    faqHtml(faqs),
    siblingsSection,
    ctaSection,
    `</div>`,
  ].filter(Boolean).join("\n");
}

function countryBodyHtml(country: BuildCountry): string {
  const crumbs = [
    { name: "Easy-Locs", href: BASE_URL },
    { name: "Locations", href: `${BASE_URL}/locations` },
    { name: `${country.flag} ${country.name}` },
  ];

  const cityLinks = country.cities
    .filter(c => c.phase === 1)
    .map(c => `<li><a href="${BASE_URL}/city/${c.slug}">${esc(c.name)}</a> — <a href="${BASE_URL}/city/${c.slug}/services">Services</a> · <a href="${BASE_URL}/city/${c.slug}/activities">Activities</a></li>`)
    .join("");

  const serviceLinks = BUILD_SERVICE_CATEGORIES
    .slice(0, 8)
    .map(s => {
      const firstCity = country.cities.find(c => c.phase === 1);
      const citySlug = firstCity?.slug || "london";
      return `<li><a href="${BASE_URL}/services/${s.slug}/in/${citySlug}">${esc(s.label)} in ${esc(country.name)}</a></li>`;
    })
    .join("");

  const faqs = [
    { q: `What rental regulations apply in ${country.name}?`, a: country.regulatoryNote + ` Easy-Locs helps landlords in ${country.name} with local document generation and compliance tools.` },
    { q: `Can I manage properties remotely in ${country.name}?`, a: `Yes. Easy-Locs provides cloud-based property management for ${country.name} including tenant communication, rent collection in ${country.currency}, and document generation.` },
    { q: `What services are available in ${country.name}?`, a: `Easy-Locs marketplace offers cleaning, maintenance, transport, tours, and more across cities in ${country.name}. All bookable online.` },
  ];

  return [
    `<div id="seo-prerender">`,
    breadcrumbHtml(crumbs),
    `<section class="seo-hero"><h1>${esc(country.flag)} ${esc(country.name)} — Food, Services, Taxi &amp; Hotel</h1><p>${esc(country.marketContext)}</p></section>`,
    `<section class="seo-section"><h2>Cities in ${esc(country.name)}</h2><ul class="seo-list">${cityLinks}</ul></section>`,
    `<section class="seo-section"><h2>Services in ${esc(country.name)}</h2><ul class="seo-grid">${serviceLinks}</ul></section>`,
    faqHtml(faqs),
    `<section class="seo-cta"><p>Join property owners and service providers in ${esc(country.name)} on Easy-Locs.</p><a href="${BASE_URL}/signup">Get started free</a></section>`,
    `</div>`,
  ].join("\n");
}

function serviceCityBodyHtml(service: BuildService, city: BuildCity, country: BuildCountry): string {
  const crumbs = [
    { name: "Easy-Locs", href: BASE_URL },
    { name: "Services", href: `${BASE_URL}/services` },
    { name: `${country.flag} ${country.name}`, href: `${BASE_URL}/country/${country.slug}` },
    { name: city.name, href: `${BASE_URL}/city/${city.slug}` },
    { name: service.label },
  ];

  const otherServices = BUILD_SERVICE_CATEGORIES
    .filter(s => s.slug !== service.slug)
    .slice(0, 8)
    .map(s => `<li><a href="${BASE_URL}/services/${s.slug}/in/${city.slug}">${esc(s.label)} in ${esc(city.name)}</a></li>`)
    .join("");

  const faqs = [
    { q: `How do I book ${service.label.toLowerCase()} in ${city.name}?`, a: `Browse available ${service.label.toLowerCase()} providers in ${city.name} on Easy-Locs. Select your preferred provider, choose a date and time, and book directly online. Payment is processed securely.` },
    { q: `How much does ${service.label.toLowerCase()} cost in ${city.name}?`, a: `Prices vary by provider and service specifics. Browse providers in ${city.name} to compare rates. All prices are displayed in ${country.currency} with transparent pricing.` },
    { q: `Can I cancel or modify my ${service.label.toLowerCase()} booking?`, a: `Yes. Each provider sets their own cancellation policy. You can view the terms before booking and manage modifications through your Easy-Locs dashboard.` },
  ];

  return [
    `<div id="seo-prerender">`,
    breadcrumbHtml(crumbs),
    `<section class="seo-hero"><h1>${esc(service.label)} in ${esc(city.name)}, ${esc(country.name)}</h1><p>${esc(service.description)} in ${esc(city.name)}, ${esc(country.name)}. Find local providers and book online through Easy-Locs.</p><p>${esc(city.localContext)}</p></section>`,
    statsBlock(city, service.slug, service.label),
    faqHtml(faqs),
    `<section class="seo-section"><h2>Other Services in ${esc(city.name)}</h2><ul class="seo-grid">${otherServices}</ul></section>`,
    `<section class="seo-cta"><a href="${BASE_URL}/signup">Book ${esc(service.label)} in ${esc(city.name)} — Get started free</a></section>`,
    `</div>`,
  ].join("\n");
}

function activityCityBodyHtml(activity: BuildActivity, city: BuildCity, country: BuildCountry): string {
  const crumbs = [
    { name: "Easy-Locs", href: BASE_URL },
    { name: "Activities", href: `${BASE_URL}/activities` },
    { name: `${country.flag} ${country.name}`, href: `${BASE_URL}/country/${country.slug}` },
    { name: city.name, href: `${BASE_URL}/city/${city.slug}/activities` },
    { name: activity.label },
  ];

  const otherActivities = BUILD_ACTIVITY_TYPES
    .filter(a => a.slug !== activity.slug)
    .slice(0, 8)
    .map(a => `<li><a href="${BASE_URL}/activities/${a.slug}/in/${city.slug}">${esc(a.label)} in ${esc(city.name)}</a></li>`)
    .join("");

  const faqs = [
    { q: `How do I book a ${activity.label.toLowerCase()} in ${city.name}?`, a: `Browse ${activity.label.toLowerCase()} providers in ${city.name} on Easy-Locs. Select a date, add participants, and book online. You'll receive confirmation from the provider.` },
    { q: `What should I know before booking a ${activity.label.toLowerCase()} in ${city.name}?`, a: `Check the provider's description for included items, duration, and requirements. ${city.localContext.split(".")[0]}.` },
    { q: `Can I cancel my ${activity.label.toLowerCase()} booking?`, a: `Cancellation policies vary by provider. Most ${city.name} activity providers offer cancellation options — check the specific terms before booking.` },
  ];

  return [
    `<div id="seo-prerender">`,
    breadcrumbHtml(crumbs),
    `<section class="seo-hero"><h1>${esc(activity.label)} in ${esc(city.name)}, ${esc(country.name)}</h1><p>Discover and book ${esc(activity.label.toLowerCase())} experiences in ${esc(city.name)}, ${esc(country.name)}. Compare providers, check availability, and book through Easy-Locs.</p><p>${esc(city.localContext)}</p></section>`,
    statsBlock(city, activity.slug, activity.label),
    faqHtml(faqs),
    `<section class="seo-section"><h2>More Activities in ${esc(city.name)}</h2><ul class="seo-grid">${otherActivities}</ul></section>`,
    `<section class="seo-cta"><a href="${BASE_URL}/signup">Book ${esc(activity.label)} in ${esc(city.name)} — Get started free</a></section>`,
    `</div>`,
  ].join("\n");
}

function marketplaceCityBodyHtml(city: BuildCity, country: BuildCountry): string {
  const crumbs = [
    { name: "Easy-Locs", href: BASE_URL },
    { name: "Marketplace", href: `${BASE_URL}/marketplace` },
    { name: `${country.flag} ${country.name}`, href: `${BASE_URL}/country/${country.slug}` },
    { name: city.name },
  ];

  const serviceLinks = BUILD_SERVICE_CATEGORIES
    .map(s => `<li><a href="${BASE_URL}/marketplace/${city.slug}/${s.slug}">${esc(s.label)}</a></li>`)
    .join("");

  return [
    `<div id="seo-prerender">`,
    breadcrumbHtml(crumbs),
    `<section class="seo-hero"><h1>${esc(city.name)} Marketplace — Services &amp; Providers | Easy-Locs</h1><p>Find and book professional services in ${esc(city.name)}, ${esc(country.name)}. Browse local providers, compare prices, and book online.</p><p>${esc(city.localContext)}</p></section>`,
    `<section class="seo-section"><h2>Service Categories in ${esc(city.name)}</h2><ul class="seo-grid">${serviceLinks}</ul></section>`,
    `<section class="seo-cta"><a href="${BASE_URL}/signup">List your service in ${esc(city.name)} — Get started free</a></section>`,
    `</div>`,
  ].join("\n");
}

// ── String helpers ─────────────────────────────────────────────────────────────
function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function esc155(s: string): string {
  return esc(s.slice(0, 155));
}

// ── HTML assembly ──────────────────────────────────────────────────────────────
function injectIntoHtml(baseHtml: string, headMeta: string, bodyContent: string): string {
  let html = baseHtml;

  // Replace <head> content — remove existing title if any
  html = html.replace(/<title>.*?<\/title>/s, "");

  // Inject meta into head
  const headEnd = html.indexOf("</head>");
  if (headEnd !== -1) {
    html = html.slice(0, headEnd) + "\n" + headMeta + "\n" + html.slice(headEnd);
  }

  // Inject pre-rendered body content immediately after <body> opening
  // Uses a hidden div with CSS — the React app will replace it on hydration
  const bodyOpen = html.indexOf("<body");
  if (bodyOpen !== -1) {
    const bodyTagEnd = html.indexOf(">", bodyOpen) + 1;
    const noScriptSection = `
<style>
  #seo-prerender { font-family: -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; max-width: 1200px; margin: 0 auto; padding: 1rem 1.5rem; }
  #seo-prerender h1 { font-size: 2rem; font-weight: 700; margin-bottom: 1rem; }
  #seo-prerender h2 { font-size: 1.25rem; font-weight: 600; margin: 2rem 0 0.75rem; }
  #seo-prerender .seo-breadcrumb ol { display: flex; flex-wrap: wrap; gap: 0.25rem; list-style: none; padding: 0.5rem 0; font-size: 0.875rem; }
  #seo-prerender .seo-grid { display: flex; flex-wrap: wrap; gap: 0.5rem; list-style: none; padding: 0; }
  #seo-prerender .seo-grid li a { padding: 0.4rem 0.75rem; border: 1px solid #ddd; border-radius: 0.375rem; text-decoration: none; color: #1a1a2e; font-size: 0.9rem; }
  #seo-prerender .seo-list { list-style: none; padding: 0; }
  #seo-prerender .seo-list li { margin-bottom: 0.5rem; }
  #seo-prerender .seo-faq dt { font-weight: 600; margin-top: 1rem; }
  #seo-prerender .seo-faq dd { margin: 0.25rem 0 0.75rem 0; color: #555; }
  #seo-prerender .seo-cta { margin: 2rem 0; padding: 1.5rem; background: #f0f4ff; border-radius: 0.75rem; }
  #seo-prerender .seo-subnav { display: flex; gap: 0.75rem; margin: 1rem 0; flex-wrap: wrap; }
  #seo-prerender .seo-subnav a { color: #4a6cf7; text-decoration: none; font-size: 0.9rem; }
  #seo-prerender .seo-hero { margin-bottom: 1rem; }
</style>
<noscript>${bodyContent}</noscript>
<aside style="display:none" aria-hidden="true">${bodyContent}</aside>`;
    html = html.slice(0, bodyTagEnd) + noScriptSection + html.slice(bodyTagEnd);
  }

  return html;
}

// ── Route builders ─────────────────────────────────────────────────────────────

interface RenderedRoute {
  urlPath: string;
  htmlFile: string;
  headMeta: string;
  bodyContent: string;
}

function buildAllRenderedRoutes(): RenderedRoute[] {
  const routes: RenderedRoute[] = [];

  // Core routes
  const coreRoutes: Array<{ path: string; title: string; desc: string; body?: string }> = [
    { path: "/", title: "Easy-Locs — Food, Services, Taxi, Hotel in One App | 190+ Countries", desc: "Easy-Locs: order food, book a taxi, find a hotel, get delivery, discover local services — all in one app. 190+ countries, 120+ currencies, 31 languages." },
    { path: "/marketplace", title: "Marketplace — Find Services Worldwide | Easy-Locs", desc: "Discover professional services across the globe. Cleaning, maintenance, transport, tours, and more." },
    { path: "/locations", title: "Locations — Easy-Locs | Cities & Countries Worldwide", desc: "Explore Easy-Locs across 190+ countries and thousands of cities. Find food, services, taxi, hotel and activities near you." },
    { path: "/property-management", title: "Property Management Software for Landlords | Easy-Locs", desc: "Cloud-based property management platform for landlords worldwide. Leases, receipts, tenant portal, accounting — all-in-one." },
    { path: "/long-term-rentals", title: "Long-Term Rentals Management | Easy-Locs", desc: "Manage long-term rental properties worldwide. Automate leases, collect rent, and handle tenant communication." },
    { path: "/seasonal-rentals", title: "Seasonal Rentals & Short-Term Property Management | Easy-Locs", desc: "Manage vacation rentals and seasonal properties with Easy-Locs. Sync calendars, automate pricing, and grow your rental income." },
    { path: "/marketplace-services", title: "Marketplace Services — Professional Services Worldwide | Easy-Locs", desc: "Find professional services worldwide. Cleaning, maintenance, transport, and more." },
    { path: "/concierge-services", title: "Concierge Services Worldwide | Easy-Locs", desc: "Luxury concierge services for property managers and guests. Private transfers, tours, restaurant reservations, and more." },
    { path: "/activities", title: "Activities & Experiences Worldwide | Easy-Locs", desc: "Book activities, tours, and unique experiences with local providers worldwide." },
    { path: "/services", title: "Services Directory | Easy-Locs", desc: "Browse all service categories on Easy-Locs marketplace. Cleaning, transport, tours, spa, restaurant, and more." },
    { path: "/about", title: "About Easy-Locs — Our Mission & Team", desc: "Learn about Easy-Locs, the super app for food, services, taxi, hotel and more in 190+ countries." },
    { path: "/contact", title: "Contact Easy-Locs — Get in Touch", desc: "Contact the Easy-Locs team for support, partnerships, or general inquiries." },
    { path: "/help", title: "Help Center | Easy-Locs", desc: "Find answers to common questions about the Easy-Locs super app platform and services." },
    { path: "/signup", title: "Sign Up Free — Easy-Locs", desc: "Create your free Easy-Locs account. Order food, book services, find hotels, and discover local experiences." },
    { path: "/login", title: "Log In — Easy-Locs", desc: "Sign in to your Easy-Locs account." },
    { path: "/vision", title: "Our Vision — Easy-Locs", desc: "Easy-Locs is building the world's most connected super app for food, services, taxi, hotel and more." },
  ];

  for (const cr of coreRoutes) {
    const canonical = `${BASE_URL}${cr.path}`;
    routes.push({
      urlPath: cr.path,
      htmlFile: cr.path === "/" ? "index.html" : `${cr.path.slice(1)}/index.html`,
      headMeta: buildHeadMeta({ title: cr.title, description: cr.desc, canonical }),
      bodyContent: cr.body || `<div id="seo-prerender"><h1>${esc(cr.title)}</h1><p>${esc(cr.desc)}</p><a href="${BASE_URL}/signup">Get started free</a></div>`,
    });
  }

  // Country hub pages
  for (const country of getBuildPhase1Countries()) {
    const canonical = `${BASE_URL}/country/${country.slug}`;
    const title = `Easy-Locs in ${country.name} ${country.flag} — Food, Services, Taxi, Hotel | Easy-Locs`;
    const desc = `Discover food, services, taxi, hotel and activities in ${country.name}. ${country.cities.length} cities covered. ${country.regulatoryNote.slice(0, 80)}`;
    routes.push({
      urlPath: `/country/${country.slug}`,
      htmlFile: `country/${country.slug}/index.html`,
      headMeta: buildHeadMeta({ title, description: desc, canonical, jsonLd: {
        "@context": "https://schema.org", "@type": "Country",
        name: country.name, url: canonical, description: country.marketContext.slice(0, 200),
      }}),
      bodyContent: countryBodyHtml(country),
    });
  }

  // Also generate for extended country slugs (fallback for countries not in build data)
  for (const slug of EXTENDED_COUNTRY_SLUGS) {
    if (getBuildCountryBySlug(slug)) continue; // already handled above
    const name = slug.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
    const canonical = `${BASE_URL}/country/${slug}`;
    routes.push({
      urlPath: `/country/${slug}`,
      htmlFile: `country/${slug}/index.html`,
      headMeta: buildHeadMeta({ title: `Easy-Locs in ${name} — Food, Services, Taxi, Hotel`, description: `Discover food, services, taxi, hotel and more in ${name} with Easy-Locs.`, canonical }),
      bodyContent: `<div id="seo-prerender"><h1>Easy-Locs in ${esc(name)}</h1><p>Easy-Locs connects you to food, services, taxi, hotel and more in ${esc(name)}.</p><a href="${BASE_URL}/signup">Get started free</a></div>`,
    });
  }

  // City hub pages and sub-pages
  const phase1Cities = getBuildPhase1Cities();
  for (const city of phase1Cities) {
    const country = BUILD_COUNTRIES.find(c => c.slug === city.countrySlug)!;
    const subPages: Array<"overview" | "services" | "activities" | "concierge"> = ["overview", "services", "activities", "concierge"];
    for (const sub of subPages) {
      const path = sub === "overview" ? `/city/${city.slug}` : `/city/${city.slug}/${sub}`;
      const canonical = `${BASE_URL}${path}`;
      const titles = {
        overview: `${city.name}, ${country.name} — Food, Services, Taxi & Hotel | Easy-Locs`,
        services: `Services in ${city.name}, ${country.name} | Easy-Locs Marketplace`,
        activities: `Things to Do in ${city.name} | Activities & Experiences | Easy-Locs`,
        concierge: `Concierge Services in ${city.name} | Easy-Locs`,
      };
      const descs = {
        overview: `Discover food, services, taxi, hotel and activities in ${city.name}. ${city.localContext.slice(0, 100)}`,
        services: `Find the best services in ${city.name}: cleaning, maintenance, transport, and more. Compare providers and book online.`,
        activities: `Discover things to do in ${city.name}. Tours, experiences, and activities with local providers. Book online with Easy-Locs.`,
        concierge: `Professional concierge services in ${city.name}. Luxury experiences, transfers, and personalized guest services.`,
      };
      const jsonLdBase = [
        { "@context": "https://schema.org", "@type": "City", name: city.name, containedInPlace: { "@type": "Country", name: country.name }, url: `${BASE_URL}/city/${city.slug}` },
        { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
          { "@type": "ListItem", position: 1, name: "Easy-Locs", item: BASE_URL },
          { "@type": "ListItem", position: 2, name: "Locations", item: `${BASE_URL}/locations` },
          { "@type": "ListItem", position: 3, name: country.name, item: `${BASE_URL}/country/${country.slug}` },
          { "@type": "ListItem", position: 4, name: city.name, item: `${BASE_URL}/city/${city.slug}` },
        ]},
      ];
      routes.push({
        urlPath: path,
        htmlFile: `${path.slice(1)}/index.html`,
        headMeta: buildHeadMeta({ title: titles[sub], description: descs[sub], canonical, jsonLd: jsonLdBase }),
        bodyContent: cityBodyHtml(city, country, sub),
      });
    }

    // Marketplace city page: /marketplace/:citySlug
    {
      const canonical = `${BASE_URL}/marketplace/${city.slug}`;
      routes.push({
        urlPath: `/marketplace/${city.slug}`,
        htmlFile: `marketplace/${city.slug}/index.html`,
        headMeta: buildHeadMeta({
          title: `Best Services in ${city.name} | Easy-Locs Marketplace`,
          description: `Find the best services in ${city.name}, ${country.name}. Cleaning, maintenance, transport, tours, and more. Compare providers and book online.`,
          canonical,
        }),
        bodyContent: marketplaceCityBodyHtml(city, country),
      });
    }

    // Marketplace service×city pages: /marketplace/:citySlug/:serviceSlug (city first, service second — matches App.tsx)
    for (const svc of BUILD_SERVICE_CATEGORIES) {
      const canonical = `${BASE_URL}/marketplace/${city.slug}/${svc.slug}`;
      const otherSvcLinks = BUILD_SERVICE_CATEGORIES
        .filter(s => s.slug !== svc.slug)
        .slice(0, 8)
        .map(s => `<li><a href="${BASE_URL}/marketplace/${city.slug}/${s.slug}">${esc(s.label)}</a></li>`)
        .join("");
      routes.push({
        urlPath: `/marketplace/${city.slug}/${svc.slug}`,
        htmlFile: `marketplace/${city.slug}/${svc.slug}/index.html`,
        headMeta: buildHeadMeta({
          title: `Best ${svc.label} in ${city.name} | Easy-Locs Marketplace`,
          description: `Find the best ${svc.label.toLowerCase()} in ${city.name}, ${country.name}. Compare providers, read reviews, and book online.`,
          canonical,
          jsonLd: { "@context": "https://schema.org", "@type": "Service", name: `${svc.label} in ${city.name}`, serviceType: svc.label, areaServed: { "@type": "City", name: city.name }, url: canonical },
        }),
        bodyContent: [
          `<div id="seo-prerender">`,
          breadcrumbHtml([
            { name: "Easy-Locs", href: BASE_URL },
            { name: "Marketplace", href: `${BASE_URL}/marketplace` },
            { name: `${country.flag} ${country.name}`, href: `${BASE_URL}/country/${country.slug}` },
            { name: city.name, href: `${BASE_URL}/marketplace/${city.slug}` },
            { name: svc.label },
          ]),
          `<section class="seo-hero"><h1>Best ${esc(svc.label)} in ${esc(city.name)}, ${esc(country.name)}</h1>`,
          `<p>${esc(svc.description)} in ${esc(city.name)}, ${esc(country.name)}. Compare local providers and book online through Easy-Locs.</p>`,
          `<p>${esc(city.localContext)}</p></section>`,
          statsBlock(city, svc.slug, svc.label),
          `<section class="seo-section"><h2>Other Services in ${esc(city.name)}</h2><ul class="seo-grid">${otherSvcLinks}</ul></section>`,
          `<section class="seo-cta"><a href="${BASE_URL}/signup">Book ${esc(svc.label)} in ${esc(city.name)} — Get started free</a></section>`,
          `</div>`,
        ].join("\n"),
      });
    }
  }

  // Extended city slugs (fallback for cities not in build data)
  for (const slug of EXTENDED_CITY_SLUGS) {
    if (phase1Cities.some(c => c.slug === slug)) continue;
    const name = slug.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
    const subPages = ["", "/services", "/activities", "/concierge"];
    for (const sub of subPages) {
      const path = `/city/${slug}${sub}`;
      const canonical = `${BASE_URL}${path}`;
      routes.push({
        urlPath: path,
        htmlFile: `${path.slice(1)}/index.html`,
        headMeta: buildHeadMeta({ title: `${name} — Food, Services, Taxi & Hotel | Easy-Locs`, description: `Discover food, services, taxi, hotel and activities in ${name} with Easy-Locs.`, canonical }),
        bodyContent: `<div id="seo-prerender"><h1>${esc(name)}</h1><p>Easy-Locs connects you to food, services, taxi, hotel and more in ${esc(name)}.</p><a href="${BASE_URL}/signup">Get started free</a></div>`,
      });
    }
    // Marketplace hub for extended city
    routes.push({
      urlPath: `/marketplace/${slug}`,
      htmlFile: `marketplace/${slug}/index.html`,
      headMeta: buildHeadMeta({ title: `${name} Marketplace | Easy-Locs`, description: `Find services in ${name} on Easy-Locs marketplace.`, canonical: `${BASE_URL}/marketplace/${slug}` }),
      bodyContent: `<div id="seo-prerender"><h1>${esc(name)} Marketplace</h1><p>Browse services in ${esc(name)} on Easy-Locs marketplace.</p></div>`,
    });
    // Marketplace service × city for extended cities (mirrors sitemap coverage for /marketplace/:citySlug/:serviceSlug)
    for (const svc of BUILD_SERVICE_CATEGORIES) {
      const canonical = `${BASE_URL}/marketplace/${slug}/${svc.slug}`;
      routes.push({
        urlPath: `/marketplace/${slug}/${svc.slug}`,
        htmlFile: `marketplace/${slug}/${svc.slug}/index.html`,
        headMeta: buildHeadMeta({ title: `Best ${svc.label} in ${name} | Easy-Locs Marketplace`, description: `Find ${svc.label.toLowerCase()} providers in ${name}. Compare and book online with Easy-Locs.`, canonical }),
        bodyContent: `<div id="seo-prerender"><h1>Best ${esc(svc.label)} in ${esc(name)}</h1><p>${esc(svc.description)} in ${esc(name)}. Compare local providers and book online through Easy-Locs.</p><a href="${BASE_URL}/signup">Book now — free to start</a></div>`,
      });
    }
  }

  // Service hub pages
  for (const svc of BUILD_SERVICE_CATEGORIES) {
    const canonical = `${BASE_URL}/services/${svc.slug}`;
    routes.push({
      urlPath: `/services/${svc.slug}`,
      htmlFile: `services/${svc.slug}/index.html`,
      headMeta: buildHeadMeta({ title: `${svc.label} Services Worldwide | Easy-Locs`, description: `Find and book ${svc.label.toLowerCase()} services worldwide through Easy-Locs marketplace.`, canonical }),
      bodyContent: `<div id="seo-prerender"><h1>${esc(svc.label)} Services</h1><p>${esc(svc.description)}. Book ${esc(svc.label.toLowerCase())} providers worldwide through Easy-Locs.</p></div>`,
    });
  }

  // Service × city pages — full phase-1 coverage
  // Route pattern: /services/:service/in/:city (matches App.tsx line ~923)
  for (const svc of BUILD_SERVICE_CATEGORIES) {
    for (const city of phase1Cities) {
      const country = BUILD_COUNTRIES.find(c => c.slug === city.countrySlug)!;
      const canonical = `${BASE_URL}/services/${svc.slug}/in/${city.slug}`;
      routes.push({
        urlPath: `/services/${svc.slug}/in/${city.slug}`,
        htmlFile: `services/${svc.slug}/in/${city.slug}/index.html`,
        headMeta: buildHeadMeta({
          title: `${svc.label} in ${city.name} | Easy-Locs`,
          description: `Book ${svc.label.toLowerCase()} in ${city.name}. Find local providers, compare prices, and book online with Easy-Locs.`,
          canonical,
          jsonLd: { "@context": "https://schema.org", "@type": "Service", name: `${svc.label} in ${city.name}`, serviceType: svc.label, areaServed: { "@type": "City", name: city.name }, provider: { "@type": "Organization", name: "Easy-Locs", url: BASE_URL } },
        }),
        bodyContent: serviceCityBodyHtml(svc, city, country),
      });
    }
    // Also extended city slugs for service pages
    for (const citySlug of EXTENDED_CITY_SLUGS) {
      if (phase1Cities.some(c => c.slug === citySlug)) continue;
      const cityName = citySlug.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
      const canonical = `${BASE_URL}/services/${svc.slug}/in/${citySlug}`;
      routes.push({
        urlPath: `/services/${svc.slug}/in/${citySlug}`,
        htmlFile: `services/${svc.slug}/in/${citySlug}/index.html`,
        headMeta: buildHeadMeta({ title: `${svc.label} in ${cityName} | Easy-Locs`, description: `Book ${svc.label.toLowerCase()} in ${cityName}. Find local providers and book online.`, canonical }),
        bodyContent: `<div id="seo-prerender"><h1>${esc(svc.label)} in ${esc(cityName)}</h1><p>${esc(svc.description)} in ${esc(cityName)}. Book online through Easy-Locs marketplace.</p></div>`,
      });
    }
  }

  // Activity × city pages — full phase-1 coverage
  // Route pattern: /activities/:activity/in/:city (matches App.tsx line ~924)
  for (const act of BUILD_ACTIVITY_TYPES) {
    for (const city of phase1Cities) {
      const country = BUILD_COUNTRIES.find(c => c.slug === city.countrySlug)!;
      const canonical = `${BASE_URL}/activities/${act.slug}/in/${city.slug}`;
      routes.push({
        urlPath: `/activities/${act.slug}/in/${city.slug}`,
        htmlFile: `activities/${act.slug}/in/${city.slug}/index.html`,
        headMeta: buildHeadMeta({
          title: `${act.label} in ${city.name} | Easy-Locs`,
          description: `Book ${act.label.toLowerCase()} in ${city.name}. Local guides, transparent pricing, and instant confirmation through Easy-Locs.`,
          canonical,
        }),
        bodyContent: activityCityBodyHtml(act, city, country),
      });
    }
    // Extended cities for activities
    for (const citySlug of EXTENDED_CITY_SLUGS) {
      if (phase1Cities.some(c => c.slug === citySlug)) continue;
      const cityName = citySlug.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
      const canonical = `${BASE_URL}/activities/${act.slug}/in/${citySlug}`;
      routes.push({
        urlPath: `/activities/${act.slug}/in/${citySlug}`,
        htmlFile: `activities/${act.slug}/in/${citySlug}/index.html`,
        headMeta: buildHeadMeta({ title: `${act.label} in ${cityName} | Easy-Locs`, description: `Book ${act.label.toLowerCase()} in ${cityName} with local providers through Easy-Locs.`, canonical }),
        bodyContent: `<div id="seo-prerender"><h1>${esc(act.label)} in ${esc(cityName)}</h1><p>Book ${esc(act.label.toLowerCase())} experiences in ${esc(cityName)} through Easy-Locs.</p></div>`,
      });
    }
  }

  return routes;
}

// ── Sitemap / prerender parity check ──────────────────────────────────────────
// Ensures every URL the sitemap will advertise to crawlers also has a pre-rendered
// HTML file.  Missing entries mean Google indexes a URL with no static body.
function checkSitemapPreRenderParity(routes: RenderedRoute[]): void {
  const preRenderPaths = new Set(routes.map(r => r.urlPath));

  const phase1Cities = BUILD_COUNTRIES
    .flatMap(c => c.cities)
    .filter(c => c.phase === 1);

  // All city slugs in sitemap: phase1 + extended (same as vite-plugin-sitemap.ts p1CitySlugs)
  const phase1Slugs = new Set(phase1Cities.map(c => c.slug));
  const allSitemapCitySlugs = [...new Set([...phase1Cities.map(c => c.slug), ...EXTENDED_CITY_SLUGS])];
  const extendedOnlySlugs = EXTENDED_CITY_SLUGS.filter(s => !phase1Slugs.has(s));

  const expectedSitemapPaths: string[] = [
    // Country hubs
    ...BUILD_COUNTRIES.map(c => `/country/${c.slug}`),
    // City hubs (all sub-pages) — phase1 + extended
    ...allSitemapCitySlugs.flatMap(slug => ["", "/services", "/activities", "/concierge"].map(s => `/city/${slug}${s}`)),
    // Service × city — phase1 cities
    ...BUILD_SERVICE_CATEGORIES.flatMap(s => phase1Cities.map(c => `/services/${s.slug}/in/${c.slug}`)),
    // Service × city — extended cities
    ...BUILD_SERVICE_CATEGORIES.flatMap(s => extendedOnlySlugs.map(slug => `/services/${s.slug}/in/${slug}`)),
    // Activity × city — phase1 cities
    ...BUILD_ACTIVITY_TYPES.flatMap(a => phase1Cities.map(c => `/activities/${a.slug}/in/${c.slug}`)),
    // Activity × city — extended cities
    ...BUILD_ACTIVITY_TYPES.flatMap(a => extendedOnlySlugs.map(slug => `/activities/${a.slug}/in/${slug}`)),
    // Marketplace city — all sitemap cities
    ...allSitemapCitySlugs.map(slug => `/marketplace/${slug}`),
    // Marketplace service × city — all sitemap cities (city first — matches App.tsx route)
    ...allSitemapCitySlugs.flatMap(slug => BUILD_SERVICE_CATEGORIES.map(s => `/marketplace/${slug}/${s.slug}`)),
  ];

  const missing = expectedSitemapPaths.filter(p => !preRenderPaths.has(p));
  if (missing.length > 0) {
    const msg = [
      `[prerender] FATAL: ${missing.length} sitemap URL(s) not covered by pre-render (first 10):`,
      ...missing.slice(0, 10).map(p => `  - ${p}`),
    ].join("\n");
    throw new Error(msg);
  }
}

// ── Runtime vs. build-time slug parity guard ──────────────────────────────────
// Reads src/lib/seo/seo-data.ts as text (no execution), extracts all slug values
// from SEO_SERVICE_CATEGORIES and SEO_ACTIVITY_TYPES using regex, then verifies
// each runtime slug is present in the build-time registries. Prevents future drift.
function checkRuntimeBuildParity(root: string): void {
  const runtimePath = path.join(root, "src/lib/seo/seo-data.ts");
  if (!fs.existsSync(runtimePath)) return; // skip if runtime file not present

  const src = fs.readFileSync(runtimePath, "utf-8");

  // Find sections for SEO_SERVICE_CATEGORIES and SEO_ACTIVITY_TYPES
  const svcSection = src.match(/SEO_SERVICE_CATEGORIES[^=]*=\s*\[([\s\S]*?)\];/)?.[1] ?? "";
  const actSection = src.match(/SEO_ACTIVITY_TYPES[^=]*=\s*\[([\s\S]*?)\];/)?.[1] ?? "";

  const extractSlugs = (section: string): string[] => {
    const slugs: string[] = [];
    let m: RegExpExecArray | null;
    const re = /slug:\s*"([a-z0-9-]+)"/g;
    while ((m = re.exec(section)) !== null) slugs.push(m[1]);
    return slugs;
  };

  const runtimeSvcSlugs = extractSlugs(svcSection);
  const runtimeActSlugs = extractSlugs(actSection);

  const buildSvcSlugs = new Set(BUILD_SERVICE_CATEGORIES.map(s => s.slug));
  const buildActSlugs = new Set(BUILD_ACTIVITY_TYPES.map(a => a.slug));

  const missingSvc = runtimeSvcSlugs.filter(s => !buildSvcSlugs.has(s));
  const missingAct = runtimeActSlugs.filter(a => !buildActSlugs.has(a));

  const errors: string[] = [
    ...missingSvc.map(s => `Service slug "${s}" is in runtime SEO registry but missing from BUILD_SERVICE_CATEGORIES in vite-seo-data.ts`),
    ...missingAct.map(a => `Activity slug "${a}" is in runtime SEO registry but missing from BUILD_ACTIVITY_TYPES in vite-seo-data.ts`),
  ];

  if (errors.length > 0) {
    const msg = [
      `[prerender] FATAL: ${errors.length} slug(s) in runtime seo-data.ts are not in build-time vite-seo-data.ts:`,
      ...errors.map(e => `  - ${e}`),
    ].join("\n");
    throw new Error(msg);
  }
}

// ── Canonical dedup check ──────────────────────────────────────────────────────
// Validates that:
//   1. No two routes share the same urlPath-derived canonical URL.
//   2. The canonical URL emitted in headMeta matches BASE_URL + urlPath exactly.
//   3. No two routes share the same headMeta-emitted canonical URL.
function checkCanonicalDedup(routes: RenderedRoute[]): void {
  // Extract canonical href from the headMeta string (finds <link rel="canonical" href="...">)
  const canonicalHrefRe = /<link rel="canonical" href="([^"]+)"/;

  const pathSeen = new Map<string, string>();
  const metaSeen = new Map<string, string>();
  const errors: string[] = [];

  for (const route of routes) {
    const derivedCanonical = `${BASE_URL}${route.urlPath}`;

    // 1. Check urlPath-derived canonical for duplicates
    if (pathSeen.has(derivedCanonical)) {
      errors.push(`Duplicate urlPath canonical: ${derivedCanonical} in ${route.htmlFile} (also in ${pathSeen.get(derivedCanonical)})`);
    } else {
      pathSeen.set(derivedCanonical, route.htmlFile);
    }

    // 2. Extract and validate headMeta canonical
    const match = canonicalHrefRe.exec(route.headMeta);
    if (!match) {
      errors.push(`Missing canonical tag in headMeta for route ${route.urlPath} (file: ${route.htmlFile})`);
      continue;
    }
    const metaCanonical = match[1];

    // 3. Verify headMeta canonical matches the derived canonical
    if (metaCanonical !== derivedCanonical) {
      errors.push(`Canonical mismatch in ${route.htmlFile}: headMeta emits "${metaCanonical}" but urlPath implies "${derivedCanonical}"`);
    }

    // 4. Check headMeta canonical for duplicates (catches cases where two different urlPaths emit same canonical)
    if (metaSeen.has(metaCanonical)) {
      errors.push(`Duplicate headMeta canonical: ${metaCanonical} in ${route.htmlFile} (also in ${metaSeen.get(metaCanonical)})`);
    } else {
      metaSeen.set(metaCanonical, route.htmlFile);
    }
  }

  if (errors.length > 0) {
    const msg = [
      `[prerender] FATAL: ${errors.length} canonical dedup violation(s):`,
      ...errors.slice(0, 10).map(e => `  - ${e}`),
    ].join("\n");
    throw new Error(msg);
  }
}

/**
 * Static route-pattern dedup: verify no two SEO route templates can emit
 * the same canonical URL for any combination of slugs.
 *
 * Each entry is a canonical URL template with named segments.
 * The test instantiates each with a unique probe slug set and checks
 * that no two templates resolve to the same concrete URL.
 *
 * Core SPA shell routes (/, /locations, /property-management, etc.) are
 * intentionally excluded: they are full app pages without SEO prerender
 * and each has a unique, hard-coded canonical managed by SEOPageShell.
 */
function checkRoutePatternDedup(): void {
  const SEO_ROUTE_PATTERNS: Array<{ name: string; template: (probes: Record<string, string>) => string }> = [
    { name: "service-hub",           template: p => `${BASE_URL}/services/${p.service}` },
    { name: "service-city-hub",      template: p => `${BASE_URL}/services/city/${p.city}` },
    { name: "service-x-city",        template: p => `${BASE_URL}/services/${p.service}/in/${p.city}` },
    { name: "activity-x-city",       template: p => `${BASE_URL}/activities/${p.activity}/in/${p.city}` },
    { name: "country-hub",           template: p => `${BASE_URL}/country/${p.country}` },
    { name: "city-hub",              template: p => `${BASE_URL}/city/${p.city}` },
    { name: "marketplace-city",      template: p => `${BASE_URL}/marketplace/${p.city}` },
    { name: "marketplace-svc-city",  template: p => `${BASE_URL}/marketplace/${p.city}/${p.service}` },
  ];

  // Probe set: unique sentinel slugs per dimension
  const probes = { service: "SVC", activity: "ACT", city: "CITY", country: "CTY" };

  const seen = new Map<string, string>();
  const errors: string[] = [];
  for (const { name, template } of SEO_ROUTE_PATTERNS) {
    const resolved = template(probes);
    if (seen.has(resolved)) {
      errors.push(`Route patterns "${name}" and "${seen.get(resolved)}" resolve to the same canonical: ${resolved}`);
    } else {
      seen.set(resolved, name);
    }
  }

  if (errors.length > 0) {
    throw new Error(`[prerender] FATAL: SEO route canonical collision:\n${errors.join("\n")}`);
  }
}

// ── Vite Plugin ────────────────────────────────────────────────────────────────
export function prerenderPlugin(): Plugin {
  return {
    name: "prerender-seo-pages",
    apply: "build",
    closeBundle: {
      sequential: true,
      async handler() {
        const root = path.resolve(".");
        const distDir = path.resolve("dist");

        if (!fs.existsSync(distDir)) {
          console.warn("[prerender] dist/ not found, skipping pre-render");
          return;
        }

        const indexPath = path.resolve(distDir, "index.html");
        if (!fs.existsSync(indexPath)) {
          console.warn("[prerender] dist/index.html not found, skipping pre-render");
          return;
        }

        const baseHtml = fs.readFileSync(indexPath, "utf-8");
        const routes = buildAllRenderedRoutes();

        // Validate runtime seo-data.ts slugs match build-time vite-seo-data.ts (prevents drift)
        checkRuntimeBuildParity(root);
        // Validate SEO route patterns are structurally distinct (no canonical collision across routes)
        checkRoutePatternDedup();
        // Validate canonical uniqueness across all prerender routes
        checkCanonicalDedup(routes);
        // Validate sitemap/prerender parity — every sitemap-advertised URL must be pre-rendered
        checkSitemapPreRenderParity(routes);

        let generated = 0;
        let skipped = 0;
        const errors: string[] = [];

        for (const route of routes) {
          if (route.htmlFile === "index.html") {
            // Root route — inject into the existing index.html
            const html = injectIntoHtml(baseHtml, route.headMeta, route.bodyContent);
            fs.writeFileSync(indexPath, html, "utf-8");
            generated++;
            continue;
          }

          const outPath = path.resolve(distDir, route.htmlFile);
          const outDir = path.dirname(outPath);

          try {
            fs.mkdirSync(outDir, { recursive: true });
            const html = injectIntoHtml(baseHtml, route.headMeta, route.bodyContent);
            fs.writeFileSync(outPath, html, "utf-8");
            generated++;
          } catch (err) {
            errors.push(`${route.urlPath}: ${err}`);
            skipped++;
          }
        }

        if (errors.length > 0) {
          console.warn(`[prerender] ${errors.length} routes failed:\n${errors.slice(0, 5).join("\n")}`);
        }

        console.log(
          `[prerender] ✓ ${generated} static HTML pages pre-rendered for SEO` +
          (skipped > 0 ? ` (${skipped} skipped)` : "")
        );
      },
    },
  };
}

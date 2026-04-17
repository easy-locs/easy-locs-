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
import { APP_LOCALES } from "./src/lib/i18n-locales";

const DEFAULT_OG_IMAGE = `${BASE_URL}/og/og-default.jpg`;

function ogImageForCity(citySlug: string): string {
  return `${BASE_URL}/og/city-${citySlug}.svg`;
}

function ogImageForService(serviceSlug: string): string {
  return `${BASE_URL}/og/service-${serviceSlug}.svg`;
}

function ogImageForServiceCity(serviceSlug: string, citySlug: string): string {
  return `${BASE_URL}/og/${serviceSlug}-${citySlug}.svg`;
}

function ogImageForCountry(countrySlug: string): string {
  return `${BASE_URL}/og/country-${countrySlug}.svg`;
}

function buildBreadcrumbJsonLd(items: Array<{ name: string; href?: string }>): object {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      ...(item.href ? { item: item.href } : {}),
    })),
  };
}

function buildFaqJsonLd(faqs: Array<{ q: string; a: string }>): object {
  return {
    "@type": "FAQPage",
    mainEntity: faqs.map(f => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: f.a,
      },
    })),
  };
}

function buildLocalBusinessJsonLd(name: string, city: string, country: string, url: string, serviceType?: string): object {
  return {
    "@type": "LocalBusiness",
    name: serviceType ? `${serviceType} in ${city}` : `Easy-Locs ${city}`,
    description: serviceType
      ? `Find ${serviceType.toLowerCase()} providers in ${city}, ${country}. Book online with Easy-Locs.`
      : `Easy-Locs services in ${city}, ${country}. Food, taxi, hotel, and local services.`,
    url,
    areaServed: { "@type": "City", name: city, containedInPlace: { "@type": "Country", name: country } },
    provider: { "@id": `${BASE_URL}/#organization` },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.7",
      reviewCount: "350",
      bestRating: "5",
    },
  };
}

function buildItemListJsonLd(name: string, items: Array<{ name: string; url: string }>): object {
  return {
    "@type": "ItemList",
    name,
    numberOfItems: items.length,
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      url: item.url,
    })),
  };
}

function relatedCitiesLinks(currentCitySlug: string, countrySlug: string): string {
  const country = BUILD_COUNTRIES.find(c => c.slug === countrySlug);
  if (!country) return "";
  const related = country.cities
    .filter(c => c.slug !== currentCitySlug && c.phase === 1)
    .slice(0, 10)
    .map(c => `<li><a href="${BASE_URL}/city/${c.slug}">${esc(c.name)}</a></li>`)
    .join("");
  if (!related) return "";
  return `<section class="seo-section"><h2>Explore Other Cities in ${esc(country.name)}</h2><ul class="seo-grid">${related}</ul></section>`;
}

function relatedServicesLinks(currentServiceSlug: string, citySlug: string): string {
  const complementary: Record<string, string[]> = {
    "cleaning": ["maintenance", "laundry", "handyman", "gardening"],
    "maintenance": ["cleaning", "construction", "handyman", "security"],
    "food-delivery": ["restaurant", "private-chef", "catering", "grocery"],
    "taxi-booking": ["airport-transfer", "car-rental", "transport"],
    "hotel-booking": ["tours", "restaurant", "spa", "concierge"],
    "tours": ["city-tour", "food-tour", "cultural-tour", "boat-tour"],
    "spa": ["beauty", "yoga-retreat", "sports-coach", "healthcare"],
    "restaurant": ["food-delivery", "private-chef", "catering"],
    "construction": ["maintenance", "interior-design", "handyman"],
    "beauty": ["spa", "photography", "personal"],
    "pet-care": ["childcare", "personal", "cleaning"],
  };
  const related = (complementary[currentServiceSlug] || [])
    .filter(slug => BUILD_SERVICE_CATEGORIES.some(s => s.slug === slug))
    .slice(0, 6);
  if (related.length === 0) return "";
  const links = related
    .map(slug => {
      const svc = BUILD_SERVICE_CATEGORIES.find(s => s.slug === slug);
      return svc ? `<li><a href="${BASE_URL}/services/${svc.slug}/in/${citySlug}">${esc(svc.label)}</a></li>` : "";
    })
    .filter(Boolean)
    .join("");
  return `<section class="seo-section"><h2>Related Services</h2><ul class="seo-grid">${links}</ul></section>`;
}

function hubSpokeNavCity(citySlug: string, cityName: string): string {
  const topServices = BUILD_SERVICE_CATEGORIES.slice(0, 8);
  const links = topServices
    .map(s => `<a href="${BASE_URL}/services/${s.slug}/in/${citySlug}">${esc(s.label)}</a>`)
    .join(" · ");
  return `<nav class="seo-hub-nav" aria-label="Services in ${esc(cityName)}"><strong>${esc(cityName)} Services:</strong> ${links}</nav>`;
}

function definitionBox(term: string, definition: string): string {
  return `<aside class="seo-definition" role="note"><strong>${esc(term)}:</strong> ${esc(definition)}</aside>`;
}

// ── Hreflang ──────────────────────────────────────────────────────────────────
// Single-URL multilingual SPA: all locales share the same canonical URL.
// Locale list derived from the canonical APP_LOCALES source of truth.
// x-default points to the canonical (en) URL per Google spec.
const HREFLANG_LOCALES = [...APP_LOCALES, "x-default"] as const;

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

function buildRouteSpeculationRules(urlPath: string): object | undefined {
  const prefetchUrls: string[] = [];
  const prerenderPatterns: string[] = [];

  if (urlPath.startsWith("/city/")) {
    const slug = urlPath.replace("/city/", "").replace(/\/.*/, "");
    prefetchUrls.push(`/city/${slug}/services`, `/city/${slug}/activities`, `/guide/${slug}`);
    prerenderPatterns.push(`/services/*/in/${slug}`);
  } else if (urlPath.startsWith("/country/")) {
    prerenderPatterns.push("/city/*");
  } else if (urlPath.startsWith("/guide/")) {
    const slug = urlPath.replace("/guide/", "");
    prefetchUrls.push(`/city/${slug}`, `/city/${slug}/services`, `/city/${slug}/activities`);
    prerenderPatterns.push(`/services/*/in/${slug}`, `/best/*/in/${slug}`);
  } else if (urlPath.startsWith("/services/") && urlPath.includes("/in/")) {
    const parts = urlPath.match(/\/services\/([^/]+)\/in\/([^/]+)/);
    if (parts) {
      prefetchUrls.push(`/city/${parts[2]}`, `/best/${parts[1]}/in/${parts[2]}`, `/compare/${parts[1]}/in/${parts[2]}`);
    }
  } else if (urlPath.startsWith("/best/") && urlPath.includes("/in/")) {
    const parts = urlPath.match(/\/best\/([^/]+)\/in\/([^/]+)/);
    if (parts) {
      prefetchUrls.push(`/compare/${parts[1]}/in/${parts[2]}`, `/services/${parts[1]}/in/${parts[2]}`, `/guide/${parts[2]}`);
    }
  } else if (urlPath.startsWith("/compare/") && urlPath.includes("/in/")) {
    const parts = urlPath.match(/\/compare\/([^/]+)\/in\/([^/]+)/);
    if (parts) {
      prefetchUrls.push(`/best/${parts[1]}/in/${parts[2]}`, `/services/${parts[1]}/in/${parts[2]}`, `/guide/${parts[2]}`);
    }
  }

  if (prefetchUrls.length === 0 && prerenderPatterns.length === 0) return undefined;

  const rules: Record<string, unknown[]> = {};
  if (prefetchUrls.length > 0) {
    rules.prefetch = [{ source: "list", urls: prefetchUrls }];
  }
  if (prerenderPatterns.length > 0) {
    rules.prerender = prerenderPatterns.map(p => ({
      source: "document",
      where: { href_matches: p },
      eagerness: "conservative",
    }));
  }
  return rules;
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

  const faqs = [
    { q: `What services are available in ${city.name}?`, a: `Easy-Locs offers ${BUILD_SERVICE_CATEGORIES.length}+ service categories in ${city.name} including cleaning, maintenance, transport, tours, food delivery, taxi, and more. All bookable online with local providers.` },
    { q: `What is the rental market like in ${city.name}?`, a: city.localContext },
    { q: `Can I book activities in ${city.name}?`, a: `Yes. Browse ${BUILD_ACTIVITY_TYPES.length}+ activity types including tours, experiences, and adventures in ${city.name} from local providers. Book online with transparent pricing in ${country.currency}.` },
    { q: `How do I find a property manager in ${city.name}?`, a: `Search our marketplace for property management services in ${city.name}. Compare providers, read reviews, and book directly.` },
    { q: `How do I order food delivery in ${city.name}?`, a: `Open Easy-Locs, browse restaurants in ${city.name}, select your meals, and place your order. Track delivery in real time from kitchen to your door.` },
    { q: `Can I book a taxi in ${city.name}?`, a: `Yes. Easy-Locs connects you with local taxi drivers in ${city.name}. Compare prices, track your ride in real time, and pay securely through the app.` },
  ];

  const nav = `<nav class="seo-subnav">
    <a href="${BASE_URL}/city/${city.slug}">Overview</a>
    <a href="${BASE_URL}/city/${city.slug}/services">Services</a>
    <a href="${BASE_URL}/city/${city.slug}/activities">Activities</a>
    <a href="${BASE_URL}/city/${city.slug}/concierge">Concierge</a>
    <a href="${BASE_URL}/marketplace/${city.slug}">Marketplace</a>
    <a href="${BASE_URL}/guide/${city.slug}">City Guide</a>
  </nav>`;

  const ctaSection = `<section class="seo-cta"><p>Easy-Locs connects property owners, guests, and service providers in ${esc(city.name)}. Order food, book a taxi, find a hotel, discover services and activities — all from one platform.</p><a href="${BASE_URL}/signup">Get started in ${esc(city.name)} — it's free</a></section>`;

  return [
    `<div id="seo-prerender">`,
    breadcrumbHtml(crumbs),
    intro,
    definitionBox(`Easy-Locs in ${city.name}`, `Easy-Locs is a super app available in ${city.name}, ${country.name} offering food delivery, taxi booking, hotel reservations, ${BUILD_SERVICE_CATEGORIES.length}+ service categories, and ${BUILD_ACTIVITY_TYPES.length}+ activity types. Free to use, supporting ${country.currency} payments.`),
    nav,
    statsBlock(city),
    hubSpokeNavCity(city.slug, city.name),
    subPage !== "activities" ? serviceLinkGrid(city.slug, BUILD_SERVICE_CATEGORIES, `Services in ${city.name}`) : "",
    subPage !== "services" ? activityLinkGrid(city.slug, BUILD_ACTIVITY_TYPES, `Activities & Things to Do in ${city.name}`) : "",
    faqHtml(faqs),
    relatedCitiesLinks(city.slug, country.slug),
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
    { q: `Are ${service.label.toLowerCase()} providers verified in ${city.name}?`, a: `Yes. All service providers on Easy-Locs are verified. Browse ratings, reviews, and credentials before booking ${service.label.toLowerCase()} in ${city.name}.` },
  ];

  return [
    `<div id="seo-prerender">`,
    breadcrumbHtml(crumbs),
    `<section class="seo-hero"><h1>${esc(service.label)} in ${esc(city.name)}, ${esc(country.name)}</h1><p>${esc(service.description)} in ${esc(city.name)}, ${esc(country.name)}. Find local providers and book online through Easy-Locs.</p><p>${esc(city.localContext)}</p></section>`,
    definitionBox(`${service.label} in ${city.name}`, `${service.description} available in ${city.name}, ${country.name}. Compare ${getProviderCount(city.slug, service.slug)} verified providers, read reviews, and book instantly through Easy-Locs. Prices in ${country.currency}.`),
    statsBlock(city, service.slug, service.label),
    `<nav class="seo-hub-nav"><strong>Back to hub:</strong> <a href="${BASE_URL}/city/${city.slug}">${esc(city.name)} Hub</a> · <a href="${BASE_URL}/services/${service.slug}">${esc(service.label)} Worldwide</a> · <a href="${BASE_URL}/country/${country.slug}">${esc(country.name)}</a></nav>`,
    faqHtml(faqs),
    relatedServicesLinks(service.slug, city.slug),
    `<section class="seo-section"><h2>Other Services in ${esc(city.name)}</h2><ul class="seo-grid">${otherServices}</ul></section>`,
    relatedCitiesLinks(city.slug, country.slug),
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
    { q: `How much does a ${activity.label.toLowerCase()} cost in ${city.name}?`, a: `Prices vary by provider, group size, and duration. Compare options on Easy-Locs with transparent pricing in ${country.currency}.` },
  ];

  return [
    `<div id="seo-prerender">`,
    breadcrumbHtml(crumbs),
    `<section class="seo-hero"><h1>${esc(activity.label)} in ${esc(city.name)}, ${esc(country.name)}</h1><p>Discover and book ${esc(activity.label.toLowerCase())} experiences in ${esc(city.name)}, ${esc(country.name)}. Compare providers, check availability, and book through Easy-Locs.</p><p>${esc(city.localContext)}</p></section>`,
    definitionBox(`${activity.label} in ${city.name}`, `Book ${activity.label.toLowerCase()} experiences in ${city.name}, ${country.name}. Compare local providers with ratings and reviews. Instant confirmation, transparent pricing in ${country.currency}.`),
    statsBlock(city, activity.slug, activity.label),
    `<nav class="seo-hub-nav"><strong>Back to hub:</strong> <a href="${BASE_URL}/city/${city.slug}/activities">Activities in ${esc(city.name)}</a> · <a href="${BASE_URL}/city/${city.slug}">${esc(city.name)} Hub</a> · <a href="${BASE_URL}/country/${country.slug}">${esc(country.name)}</a></nav>`,
    faqHtml(faqs),
    `<section class="seo-section"><h2>More Activities in ${esc(city.name)}</h2><ul class="seo-grid">${otherActivities}</ul></section>`,
    relatedCitiesLinks(city.slug, country.slug),
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
  // Escape first, then hard-cap at 155 chars so that HTML entities
  // (e.g. "&" → "&amp;", which inflates a 1-char source by +4) never push
  // the final attribute value over the 155-char SEO limit. We also avoid
  // splitting an entity in half, which would emit invalid HTML.
  const escaped = esc(s);
  if (escaped.length <= 155) return escaped;
  let cut = 155;
  const lastAmp = escaped.lastIndexOf("&", cut - 1);
  if (lastAmp !== -1) {
    const semi = escaped.indexOf(";", lastAmp);
    if (semi === -1 || semi >= cut) cut = lastAmp;
  }
  return escaped.slice(0, cut);
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
  #seo-prerender .seo-hub-nav { margin: 1rem 0; font-size: 0.9rem; line-height: 1.8; }
  #seo-prerender .seo-hub-nav a { color: #4a6cf7; text-decoration: none; }
  #seo-prerender .seo-definition { margin: 1rem 0; padding: 1rem 1.25rem; background: #f8fffe; border-left: 4px solid #1AAE8E; border-radius: 0.375rem; font-size: 0.95rem; line-height: 1.6; }
  #seo-prerender .seo-guide { line-height: 1.8; }
  #seo-prerender .seo-guide p { margin-bottom: 1rem; }
  #seo-prerender .seo-lead { font-size: 1.1rem; color: #334155; }
  #seo-prerender .seo-stats-list { list-style: none; padding: 0; display: flex; flex-wrap: wrap; gap: 1rem; }
  #seo-prerender .seo-stats-list li { font-size: 0.9rem; }
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
    { path: "/annonces", title: "Annonces — Petites Annonces entre Particuliers | Easy-Locs", desc: "Achetez et vendez entre particuliers : véhicules, électronique, mode, maison et plus. Paiement sécurisé par QR Wallet." },
    { path: "/annonces/recherche", title: "Recherche Annonces — Trouvez ce que vous cherchez | Easy-Locs", desc: "Recherchez parmi des milliers d'annonces : filtrez par catégorie, prix, localisation et état. Découvrez les meilleures offres près de chez vous." },
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
    const countryCrumbs = [
      { name: "Easy-Locs", href: BASE_URL },
      { name: "Locations", href: `${BASE_URL}/locations` },
      { name: country.name },
    ];
    const countryJsonLd = {
      "@context": "https://schema.org",
      "@graph": [
        { "@type": "Country", name: country.name, url: canonical, description: country.marketContext.slice(0, 200) },
        buildBreadcrumbJsonLd(countryCrumbs),
        buildItemListJsonLd(`Cities in ${country.name}`, country.cities.filter(c => c.phase === 1).map(c => ({
          name: c.name, url: `${BASE_URL}/city/${c.slug}`,
        }))),
      ],
    };
    routes.push({
      urlPath: `/country/${country.slug}`,
      htmlFile: `country/${country.slug}/index.html`,
      headMeta: buildHeadMeta({ title, description: desc, canonical, ogImage: ogImageForCountry(country.slug), jsonLd: countryJsonLd }),
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
      const crumbItems = [
        { name: "Easy-Locs", href: BASE_URL },
        { name: "Locations", href: `${BASE_URL}/locations` },
        { name: country.name, href: `${BASE_URL}/country/${country.slug}` },
        { name: city.name, href: `${BASE_URL}/city/${city.slug}` },
      ];
      const cityFaqs = [
        { q: `What services are available in ${city.name}?`, a: `Easy-Locs offers ${BUILD_SERVICE_CATEGORIES.length}+ service categories in ${city.name} including food delivery, taxi, hotels, cleaning, maintenance, and more.` },
        { q: `Can I book activities in ${city.name}?`, a: `Yes. Browse ${BUILD_ACTIVITY_TYPES.length}+ activity types in ${city.name}. Book online with transparent pricing.` },
      ];
      const serviceItems = BUILD_SERVICE_CATEGORIES.slice(0, 12).map(s => ({
        name: `${s.label} in ${city.name}`,
        url: `${BASE_URL}/services/${s.slug}/in/${city.slug}`,
      }));
      const jsonLdGraph = {
        "@context": "https://schema.org",
        "@graph": [
          buildLocalBusinessJsonLd(city.name, city.name, country.name, canonical),
          buildBreadcrumbJsonLd(crumbItems),
          buildFaqJsonLd(cityFaqs),
          buildItemListJsonLd(`Services in ${city.name}`, serviceItems),
        ],
      };
      routes.push({
        urlPath: path,
        htmlFile: `${path.slice(1)}/index.html`,
        headMeta: buildHeadMeta({ title: titles[sub], description: descs[sub], canonical, ogImage: ogImageForCity(city.slug), jsonLd: jsonLdGraph }),
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
          jsonLd: { "@context": "https://schema.org", "@graph": [
            { "@type": "Product", name: `${svc.label} in ${city.name}`, description: `${svc.description} in ${city.name}, ${country.name}`, url: canonical, brand: { "@type": "Brand", name: "Easy-Locs" }, offers: { "@type": "AggregateOffer", priceCurrency: country.currency, availability: "https://schema.org/InStock", offerCount: String(getProviderCount(city.slug, svc.slug)) }, aggregateRating: { "@type": "AggregateRating", ratingValue: "4.7", reviewCount: String(getProviderCount(city.slug, svc.slug)), bestRating: "5" }, review: { "@type": "Review", reviewRating: { "@type": "Rating", ratingValue: "5", bestRating: "5" }, author: { "@type": "Person", name: "Easy-Locs User" }, reviewBody: `Great ${svc.label.toLowerCase()} service in ${city.name}. Booked through Easy-Locs with transparent pricing.` } },
            buildBreadcrumbJsonLd([{ name: "Easy-Locs", href: BASE_URL }, { name: "Marketplace", href: `${BASE_URL}/marketplace` }, { name: country.name, href: `${BASE_URL}/country/${country.slug}` }, { name: city.name, href: `${BASE_URL}/marketplace/${city.slug}` }, { name: svc.label }]),
          ]},
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
      const svcCrumbs = [
        { name: "Easy-Locs", href: BASE_URL },
        { name: "Services", href: `${BASE_URL}/services` },
        { name: country.name, href: `${BASE_URL}/country/${country.slug}` },
        { name: city.name, href: `${BASE_URL}/city/${city.slug}` },
        { name: svc.label },
      ];
      const svcFaqs = [
        { q: `How do I book ${svc.label.toLowerCase()} in ${city.name}?`, a: `Browse providers, compare prices, and book online through Easy-Locs.` },
        { q: `How much does ${svc.label.toLowerCase()} cost in ${city.name}?`, a: `Prices vary. Compare rates from ${getProviderCount(city.slug, svc.slug)} providers in ${country.currency}.` },
      ];
      const svcJsonLd = {
        "@context": "https://schema.org",
        "@graph": [
          { "@type": "Service", name: `${svc.label} in ${city.name}`, serviceType: svc.label, description: `${svc.description} in ${city.name}, ${country.name}`, url: canonical, areaServed: { "@type": "City", name: city.name, containedInPlace: { "@type": "Country", name: country.name } }, provider: { "@id": `${BASE_URL}/#organization` }, offers: { "@type": "Offer", availability: "https://schema.org/InStock", priceCurrency: country.currency }, aggregateRating: { "@type": "AggregateRating", ratingValue: "4.7", reviewCount: "120", bestRating: "5" } },
          buildBreadcrumbJsonLd(svcCrumbs),
          buildFaqJsonLd(svcFaqs),
          buildLocalBusinessJsonLd(svc.label, city.name, country.name, canonical, svc.label),
        ],
      };
      routes.push({
        urlPath: `/services/${svc.slug}/in/${city.slug}`,
        htmlFile: `services/${svc.slug}/in/${city.slug}/index.html`,
        headMeta: buildHeadMeta({
          title: `${svc.label} in ${city.name} | Easy-Locs`,
          description: `Book ${svc.label.toLowerCase()} in ${city.name}. Find local providers, compare prices, and book online with Easy-Locs.`,
          canonical,
          ogImage: ogImageForServiceCity(svc.slug, city.slug),
          jsonLd: svcJsonLd,
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
      const actJsonLd = {
        "@context": "https://schema.org",
        "@graph": [
          { "@type": "Event", name: `${act.label} in ${city.name}`, description: `Book ${act.label.toLowerCase()} experiences in ${city.name}, ${country.name}. Local guides and instant confirmation.`, url: canonical, location: { "@type": "Place", name: city.name, address: { "@type": "PostalAddress", addressLocality: city.name, addressCountry: country.name } }, organizer: { "@id": `${BASE_URL}/#organization` }, eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode", eventStatus: "https://schema.org/EventScheduled", offers: { "@type": "Offer", availability: "https://schema.org/InStock", priceCurrency: country.currency, url: canonical } },
          buildBreadcrumbJsonLd([{ name: "Easy-Locs", href: BASE_URL }, { name: "Activities", href: `${BASE_URL}/activities` }, { name: country.name, href: `${BASE_URL}/country/${country.slug}` }, { name: city.name, href: `${BASE_URL}/city/${city.slug}` }, { name: act.label }]),
        ],
      };
      routes.push({
        urlPath: `/activities/${act.slug}/in/${city.slug}`,
        htmlFile: `activities/${act.slug}/in/${city.slug}/index.html`,
        headMeta: buildHeadMeta({
          title: `${act.label} in ${city.name} | Easy-Locs`,
          description: `Book ${act.label.toLowerCase()} in ${city.name}. Local guides, transparent pricing, and instant confirmation through Easy-Locs.`,
          canonical,
          jsonLd: actJsonLd,
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

  // ── Content Hub: City Guides (/guide/:city) — Topical Authority ──
  for (const city of phase1Cities) {
    const country = BUILD_COUNTRIES.find(c => c.slug === city.countrySlug)!;
    const canonical = `${BASE_URL}/guide/${city.slug}`;
    const title = `Complete Guide to ${city.name}, ${country.name} — Food, Services & More | Easy-Locs`;
    const desc = `Your comprehensive guide to ${city.name}: where to eat, how to get around, best services, top activities, and local tips. Everything you need in one place.`;
    const topServices = BUILD_SERVICE_CATEGORIES.slice(0, 10);
    const topActivities = BUILD_ACTIVITY_TYPES.slice(0, 8);

    const guideBody = [
      `<div id="seo-prerender">`,
      breadcrumbHtml([
        { name: "Easy-Locs", href: BASE_URL },
        { name: "City Guides", href: `${BASE_URL}/guide/paris` },
        { name: city.name },
      ]),
      `<article class="seo-guide">`,
      `<section class="seo-hero"><h1>Complete Guide to ${esc(city.name)}, ${esc(country.name)}</h1>`,
      `<p class="seo-lead">${esc(city.localContext)}</p></section>`,
      definitionBox(`${city.name} Overview`, `${city.name} is a major city in ${country.name} served by Easy-Locs. The local currency is ${country.currency}. Easy-Locs offers ${BUILD_SERVICE_CATEGORIES.length}+ service categories and ${BUILD_ACTIVITY_TYPES.length}+ activity types in ${city.name}.`),
      `<section class="seo-section"><h2>Getting Around ${esc(city.name)}</h2>`,
      `<p>${esc(city.name)} offers multiple transportation options through Easy-Locs. Book a taxi for instant rides, arrange airport transfers for seamless arrivals and departures, or rent a car for flexible exploration. All transport services feature real-time tracking, transparent pricing in ${esc(country.currency)}, and secure in-app payment. Whether you need a quick ride across town or a full-day rental, Easy-Locs connects you with verified local transport providers in ${esc(city.name)}.</p></section>`,
      `<section class="seo-section"><h2>Where to Eat in ${esc(city.name)}</h2>`,
      `<p>Discover the best restaurants and food delivery options in ${esc(city.name)} through Easy-Locs. Browse local restaurants, order delivery to your accommodation, or book a private chef for a special dining experience. From traditional ${esc(country.name)} cuisine to international flavors, ${esc(city.name)} offers a diverse culinary scene. Easy-Locs food delivery connects you with top-rated restaurants featuring real-time order tracking and delivery to your door.</p></section>`,
      `<section class="seo-section"><h2>Best Services in ${esc(city.name)}</h2>`,
      `<p>Easy-Locs marketplace in ${esc(city.name)} features ${getProviderCount(city.slug)} verified local providers across ${esc(String(BUILD_SERVICE_CATEGORIES.length))} service categories. Whether you need professional cleaning, property maintenance, legal services, beauty treatments, or healthcare, find and book trusted providers with transparent pricing and verified reviews.</p>`,
      serviceLinkGrid(city.slug, topServices, `Top Service Categories in ${city.name}`),
      `</section>`,
      `<section class="seo-section"><h2>Things to Do in ${esc(city.name)}</h2>`,
      `<p>Explore ${esc(city.name)} with curated activities and experiences from local guides. From cultural tours and food experiences to outdoor adventures and wellness retreats, Easy-Locs connects you with the best activity providers in ${esc(city.name)}. All activities feature instant confirmation, transparent pricing in ${esc(country.currency)}, and verified local guides.</p>`,
      activityLinkGrid(city.slug, topActivities, `Popular Activities in ${city.name}`),
      `</section>`,
      `<section class="seo-section"><h2>Accommodation in ${esc(city.name)}</h2>`,
      `<p>Find hotels, apartments, and vacation rentals in ${esc(city.name)} through Easy-Locs. Compare rates, read reviews, and book instantly. From luxury hotels in prime locations to budget-friendly apartments for longer stays, Easy-Locs helps you find the perfect accommodation in ${esc(city.name)}. All bookings include instant confirmation, flexible cancellation options, and 24/7 support.</p></section>`,
      `<section class="seo-section"><h2>Local Tips for ${esc(city.name)}</h2>`,
      `<p>The local currency in ${esc(city.name)} is ${esc(country.currency)}. Easy-Locs supports payment in ${esc(country.currency)} and 120+ other currencies. The primary language is ${esc(country.language)}, but Easy-Locs is available in 31 languages for your convenience. ${esc(city.localContext.split(".")[0])}. For property owners and managers, Easy-Locs offers comprehensive property management tools including lease management, tenant communication, and rent collection.</p></section>`,
      faqHtml([
        { q: `What is the best way to get around ${city.name}?`, a: `Book taxis, airport transfers, or car rentals through Easy-Locs. All transport services in ${city.name} feature real-time tracking and transparent pricing in ${country.currency}.` },
        { q: `Where can I find the best restaurants in ${city.name}?`, a: `Browse restaurants in ${city.name} on Easy-Locs. Order delivery, book a table, or hire a private chef. All providers are rated and reviewed.` },
        { q: `What activities are popular in ${city.name}?`, a: `Top activities in ${city.name} include ${topActivities.slice(0, 4).map(a => a.label.toLowerCase()).join(", ")}, and more. Book with verified local providers through Easy-Locs.` },
        { q: `How do I find reliable services in ${city.name}?`, a: `Easy-Locs marketplace features ${getProviderCount(city.slug)} verified providers in ${city.name} across ${BUILD_SERVICE_CATEGORIES.length}+ categories. Compare ratings, read reviews, and book directly.` },
        { q: `Is Easy-Locs available in ${city.name}?`, a: `Yes. Easy-Locs is fully operational in ${city.name}, ${country.name}. Access food delivery, taxi, hotel booking, local services, and activities.` },
      ]),
      hubSpokeNavCity(city.slug, city.name),
      relatedCitiesLinks(city.slug, country.slug),
      `<section class="seo-cta"><p>Ready to explore ${esc(city.name)}? Easy-Locs gives you everything you need — food, transport, accommodation, services, and activities — all from one app.</p><a href="${BASE_URL}/signup">Get started in ${esc(city.name)} — it's free</a></section>`,
      `</article>`,
      `</div>`,
    ].join("\n");

    const guideJsonLd = {
      "@context": "https://schema.org",
      "@graph": [
        { "@type": "Article", headline: title.split(" |")[0], description: desc, url: canonical, author: { "@id": `${BASE_URL}/#organization` }, publisher: { "@id": `${BASE_URL}/#organization` }, datePublished: "2026-01-01", dateModified: new Date().toISOString().slice(0, 10), about: { "@type": "City", name: city.name, containedInPlace: { "@type": "Country", name: country.name } } },
        buildBreadcrumbJsonLd([{ name: "Easy-Locs", href: BASE_URL }, { name: "City Guides" }, { name: city.name }]),
        buildFaqJsonLd([
          { q: `What is the best way to get around ${city.name}?`, a: `Book taxis, airport transfers, or car rentals through Easy-Locs.` },
          { q: `Where can I find the best restaurants in ${city.name}?`, a: `Browse restaurants in ${city.name} on Easy-Locs. Order delivery or book a private chef.` },
        ]),
        { "@type": "HowTo", name: `How to Use Easy-Locs in ${city.name}`, step: [
          { "@type": "HowToStep", position: 1, text: `Open Easy-Locs and set your location to ${city.name}` },
          { "@type": "HowToStep", position: 2, text: "Browse services, restaurants, activities, or transport options" },
          { "@type": "HowToStep", position: 3, text: "Compare providers, read reviews, and check prices" },
          { "@type": "HowToStep", position: 4, text: `Book online with secure payment in ${country.currency}` },
        ]},
      ],
    };

    routes.push({
      urlPath: `/guide/${city.slug}`,
      htmlFile: `guide/${city.slug}/index.html`,
      headMeta: buildHeadMeta({ title, description: desc, canonical, ogImage: ogImageForCity(city.slug), jsonLd: guideJsonLd }),
      bodyContent: guideBody,
    });
  }

  // ── Content Hub: Best-of pages (/best/:service/in/:city) ──
  const topCities = phase1Cities.slice(0, 10);
  const topSvcs = BUILD_SERVICE_CATEGORIES.slice(0, 8);
  for (const svc of topSvcs) {
    for (const city of topCities) {
      const country = BUILD_COUNTRIES.find(c => c.slug === city.countrySlug)!;
      const canonical = `${BASE_URL}/best/${svc.slug}/in/${city.slug}`;
      const title = `Best ${svc.label} in ${city.name}, ${country.name} — Top Providers | Easy-Locs`;
      const desc = `Find the best ${svc.label.toLowerCase()} providers in ${city.name}. Compare ratings, read reviews, and book the top-rated ${svc.label.toLowerCase()} services.`;

      const bestBody = [
        `<div id="seo-prerender">`,
        breadcrumbHtml([
          { name: "Easy-Locs", href: BASE_URL },
          { name: "Best Services" },
          { name: svc.label, href: `${BASE_URL}/services/${svc.slug}` },
          { name: city.name, href: `${BASE_URL}/city/${city.slug}` },
        ]),
        `<article class="seo-guide">`,
        `<section class="seo-hero"><h1>Best ${esc(svc.label)} in ${esc(city.name)}, ${esc(country.name)}</h1>`,
        `<p>${esc(svc.description)} in ${esc(city.name)}. We help you find the top-rated providers with verified reviews, transparent pricing in ${esc(country.currency)}, and instant booking. Whether you are a resident, tourist, or business traveler in ${esc(city.name)}, Easy-Locs connects you with the most reliable ${esc(svc.label.toLowerCase())} professionals in the city.</p></section>`,
        definitionBox(`${svc.label} in ${city.name}`, `${svc.description} available from ${getProviderCount(city.slug, svc.slug)} verified providers in ${city.name}. All rated and reviewed by real customers.`),
        statsBlock(city, svc.slug, svc.label),
        `<section class="seo-section"><h2>How to Choose the Best ${esc(svc.label)} in ${esc(city.name)}</h2>`,
        `<p>When selecting a ${esc(svc.label.toLowerCase())} provider in ${esc(city.name)}, consider these factors: provider ratings and review count, service experience and specialization, pricing transparency, response time, and availability. Easy-Locs shows you all this information upfront so you can make an informed decision. All providers are verified and rated by real customers who have used their services in ${esc(city.name)}.</p>`,
        `<p>Start by filtering providers by overall star rating. Providers with 4.5 stars and above consistently deliver excellent service. Then review the total number of ratings to ensure the score is backed by substantial feedback. Pay attention to recent reviews, as they reflect the provider's current service quality. Easy-Locs automatically highlights providers with strong recent performance in ${esc(city.name)}.</p></section>`,
        `<section class="seo-section"><h2>Top-Rated ${esc(svc.label)} Providers in ${esc(city.name)}</h2>`,
        `<p>Easy-Locs features ${getProviderCount(city.slug, svc.slug)} verified ${esc(svc.label.toLowerCase())} providers in ${esc(city.name)}, each with a complete profile including service descriptions, portfolio images, certifications, and customer reviews. Top providers in ${esc(city.name)} consistently receive ratings above 4.5 stars and have completed hundreds of bookings through the platform. Their profiles include response time metrics, cancellation policies, and detailed service breakdowns so you know exactly what to expect.</p>`,
        `<p>Providers on Easy-Locs are verified through a multi-step process: identity verification, professional qualification checks, insurance validation where applicable, and ongoing performance monitoring. This ensures that every ${esc(svc.label.toLowerCase())} provider you book in ${esc(city.name)} meets our quality standards. Providers who fall below minimum ratings are flagged and reviewed by our trust and safety team.</p></section>`,
        `<section class="seo-section"><h2>Pricing Guide for ${esc(svc.label)} in ${esc(city.name)}</h2>`,
        `<p>Prices for ${esc(svc.label.toLowerCase())} in ${esc(city.name)} vary based on the specific service requested, provider experience, and timing. Easy-Locs displays all prices transparently in ${esc(country.currency)} before you book, with no hidden fees. Compare multiple providers side by side to find the best value for your needs.</p>`,
        `<p>Most ${esc(svc.label.toLowerCase())} providers in ${esc(city.name)} offer both fixed-price packages and custom quotes. Fixed-price packages are ideal for standard services and provide upfront cost certainty. For complex or customized requirements, request a custom quote from multiple providers simultaneously through Easy-Locs and compare proposals side by side. All payments are processed securely through the platform with buyer protection included.</p></section>`,
        `<section class="seo-section"><h2>Booking ${esc(svc.label)} Through Easy-Locs</h2>`,
        `<p>Booking ${esc(svc.label.toLowerCase())} in ${esc(city.name)} through Easy-Locs is straightforward. Browse available providers, filter by your preferences, review profiles and ratings, then book directly through the platform. You will receive instant confirmation, provider contact details, and all booking information in your Easy-Locs dashboard. The platform supports payment in ${esc(country.currency)} and 120+ other currencies, with multiple payment methods including credit cards, digital wallets, and local payment options popular in ${esc(country.name)}.</p>`,
        `<p>After your service is completed, you can rate and review the provider to help other customers in ${esc(city.name)} make informed decisions. Your honest feedback contributes to maintaining the high quality standards that make Easy-Locs the trusted platform for ${esc(svc.label.toLowerCase())} in ${esc(city.name)} and across ${esc(country.name)}.</p></section>`,
        `<section class="seo-section"><h2>Why Use Easy-Locs for ${esc(svc.label)} in ${esc(city.name)}</h2>`,
        `<p>Easy-Locs offers several advantages when booking ${esc(svc.label.toLowerCase())} in ${esc(city.name)}: verified provider profiles with real customer reviews, transparent pricing with no hidden fees, secure payment processing with buyer protection, instant booking confirmation, multilingual support in 31 languages, and dedicated customer service available around the clock. The platform is available in ${esc(city.name)} and across 190+ countries worldwide.</p></section>`,
        faqHtml([
          { q: `Who are the best ${svc.label.toLowerCase()} providers in ${city.name}?`, a: `Browse the top-rated ${svc.label.toLowerCase()} providers in ${city.name} on Easy-Locs. Sort by rating, reviews, and price to find the best match. All providers are verified with real customer reviews.` },
          { q: `How much does ${svc.label.toLowerCase()} cost in ${city.name}?`, a: `Prices vary by provider and service scope. Compare rates from ${getProviderCount(city.slug, svc.slug)} providers on Easy-Locs. All prices shown transparently in ${country.currency} before booking.` },
          { q: `Can I read reviews for ${svc.label.toLowerCase()} providers in ${city.name}?`, a: `Yes. All providers on Easy-Locs have verified customer reviews. Read detailed feedback, see ratings, and view provider portfolios before making your decision.` },
          { q: `How do I book ${svc.label.toLowerCase()} in ${city.name}?`, a: `Search for ${svc.label.toLowerCase()} in ${city.name} on Easy-Locs, compare providers, and book directly through the platform. Instant confirmation and secure payment included.` },
          { q: `Are ${svc.label.toLowerCase()} providers in ${city.name} verified?`, a: `Yes. Every provider on Easy-Locs undergoes identity verification, qualification checks, and ongoing performance monitoring to maintain quality standards.` },
        ]),
        relatedServicesLinks(svc.slug, city.slug),
        `<nav class="seo-hub-nav"><strong>More in ${esc(city.name)}:</strong> <a href="${BASE_URL}/city/${city.slug}">${esc(city.name)} Hub</a> · <a href="${BASE_URL}/guide/${city.slug}">City Guide</a> · <a href="${BASE_URL}/services/${svc.slug}">All ${esc(svc.label)}</a></nav>`,
        `<section class="seo-cta"><a href="${BASE_URL}/signup">Book the best ${esc(svc.label)} in ${esc(city.name)} — Get started free</a></section>`,
        `</article>`,
        `</div>`,
      ].join("\n");

      const bestCrumbs = [
        { name: "Easy-Locs", href: BASE_URL },
        { name: "Best Services" },
        { name: svc.label, href: `${BASE_URL}/services/${svc.slug}` },
        { name: city.name, href: `${BASE_URL}/city/${city.slug}` },
      ];
      const bestFaqs = [
        { q: `Who are the best ${svc.label.toLowerCase()} providers in ${city.name}?`, a: `Browse the top-rated ${svc.label.toLowerCase()} providers in ${city.name} on Easy-Locs. Sort by rating, reviews, and price.` },
        { q: `How much does ${svc.label.toLowerCase()} cost in ${city.name}?`, a: `Prices vary by provider. Compare rates from ${getProviderCount(city.slug, svc.slug)} providers on Easy-Locs in ${country.currency}.` },
        { q: `Can I read reviews for ${svc.label.toLowerCase()} providers in ${city.name}?`, a: `Yes. All providers on Easy-Locs have verified customer reviews.` },
      ];
      const bestJsonLd = {
        "@context": "https://schema.org",
        "@graph": [
          { "@type": "Service", name: `Best ${svc.label} in ${city.name}`, serviceType: svc.label, description: desc, url: canonical, areaServed: { "@type": "City", name: city.name, containedInPlace: { "@type": "Country", name: country.name } }, provider: { "@id": `${BASE_URL}/#organization` }, aggregateRating: { "@type": "AggregateRating", ratingValue: "4.8", reviewCount: String(getProviderCount(city.slug, svc.slug)), bestRating: "5" } },
          buildBreadcrumbJsonLd(bestCrumbs),
          buildFaqJsonLd(bestFaqs),
          buildItemListJsonLd(`Top ${svc.label} Providers in ${city.name}`, [
            { name: `${svc.label} in ${city.name}`, url: `${BASE_URL}/services/${svc.slug}/in/${city.slug}` },
            { name: `${city.name} Services`, url: `${BASE_URL}/city/${city.slug}/services` },
            { name: `${city.name} Guide`, url: `${BASE_URL}/guide/${city.slug}` },
          ]),
        ],
      };

      routes.push({
        urlPath: `/best/${svc.slug}/in/${city.slug}`,
        htmlFile: `best/${svc.slug}/in/${city.slug}/index.html`,
        headMeta: buildHeadMeta({ title, description: desc, canonical, ogImage: ogImageForServiceCity(svc.slug, city.slug), jsonLd: bestJsonLd }),
        bodyContent: bestBody,
      });
    }
  }

  // ── Content Hub: Compare pages (/compare/:service/in/:city) ──
  for (const svc of topSvcs) {
    for (const city of topCities) {
      const country = BUILD_COUNTRIES.find(c => c.slug === city.countrySlug)!;
      const canonical = `${BASE_URL}/compare/${svc.slug}/in/${city.slug}`;
      const title = `Compare ${svc.label} in ${city.name}, ${country.name} — Providers & Prices | Easy-Locs`;
      const desc = `Compare ${svc.label.toLowerCase()} providers in ${city.name}. Side-by-side pricing, ratings, reviews, and availability. Find the right provider for you.`;

      const compareBody = [
        `<div id="seo-prerender">`,
        breadcrumbHtml([
          { name: "Easy-Locs", href: BASE_URL },
          { name: "Compare" },
          { name: svc.label, href: `${BASE_URL}/services/${svc.slug}` },
          { name: city.name, href: `${BASE_URL}/city/${city.slug}` },
        ]),
        `<article class="seo-guide">`,
        `<section class="seo-hero"><h1>Compare ${esc(svc.label)} Providers in ${esc(city.name)}, ${esc(country.name)}</h1>`,
        `<p>Side-by-side comparison of ${esc(svc.label.toLowerCase())} providers in ${esc(city.name)}, ${esc(country.name)}. Compare pricing, ratings, response times, and availability to find the perfect match for your needs. Easy-Locs makes it easy to evaluate ${getProviderCount(city.slug, svc.slug)} verified providers at a glance.</p></section>`,
        definitionBox(`${svc.label} Comparison`, `Easy-Locs lists ${getProviderCount(city.slug, svc.slug)} verified ${svc.label.toLowerCase()} providers in ${city.name}. Compare them side-by-side with transparent pricing in ${country.currency}.`),
        statsBlock(city, svc.slug, svc.label),
        `<section class="seo-section"><h2>What to Compare When Choosing ${esc(svc.label)} in ${esc(city.name)}</h2>`,
        `<p>When comparing ${esc(svc.label.toLowerCase())} providers in ${esc(city.name)}, consider these key factors:</p>`,
        `<ul class="seo-grid"><li><strong>Rating</strong> — Average customer rating out of 5 stars based on verified reviews</li><li><strong>Reviews</strong> — Number of verified customer reviews and overall sentiment</li><li><strong>Price</strong> — Transparent pricing in ${esc(country.currency)} with no hidden fees</li><li><strong>Response Time</strong> — How quickly providers respond to booking requests</li><li><strong>Experience</strong> — Years of service, specialization areas, and certifications</li><li><strong>Availability</strong> — Same-day, next-day, or scheduled service options</li></ul>`,
        `<p>Each of these factors plays an important role in your decision. Rating and review count together indicate reliability: a provider with 4.8 stars from 200 reviews is generally more trustworthy than one with 5 stars from just 3 reviews. Price is important but should be evaluated alongside service quality. The cheapest option is not always the best value, especially for complex ${esc(svc.label.toLowerCase())} work in ${esc(city.name)}.</p></section>`,
        `<section class="seo-section"><h2>How Easy-Locs Helps You Compare ${esc(svc.label)}</h2>`,
        `<p>Easy-Locs provides real-time comparison tools for ${esc(svc.label.toLowerCase())} in ${esc(city.name)}. View all providers in a unified dashboard with filters for price range, rating minimum, availability, and distance. Every provider profile includes verified reviews, portfolio images, certifications, and transparent pricing. Request quotes from multiple providers simultaneously and compare responses side-by-side.</p>`,
        `<p>The comparison dashboard displays key metrics for each provider: average rating, total review count, response time, starting price, service area coverage, and available booking slots. You can sort by any metric and apply multiple filters to narrow down your options. Save providers to a shortlist for easy reference and request quotes from your top choices with a single action.</p></section>`,
        `<section class="seo-section"><h2>Pricing Comparison for ${esc(svc.label)} in ${esc(city.name)}</h2>`,
        `<p>Prices for ${esc(svc.label.toLowerCase())} in ${esc(city.name)} vary based on scope, provider experience, and timing. Easy-Locs shows all prices in ${esc(country.currency)} with no hidden fees. Use our comparison tools to find providers that match your budget, and request custom quotes for specific requirements.</p>`,
        `<p>When comparing prices, look beyond the initial quote. Consider what is included in each provider's package: some providers bundle materials and travel costs, while others list them separately. Easy-Locs displays the total estimated cost including all fees so you can make accurate comparisons. For recurring ${esc(svc.label.toLowerCase())} services in ${esc(city.name)}, many providers offer package discounts that can significantly reduce long-term costs.</p></section>`,
        `<section class="seo-section"><h2>Provider Verification Process</h2>`,
        `<p>All ${esc(svc.label.toLowerCase())} providers on Easy-Locs in ${esc(city.name)} undergo a thorough verification process. This includes identity verification, professional qualification validation, business registration checks, and where applicable, insurance and licensing confirmation. Providers must maintain a minimum customer satisfaction rating to remain active on the platform. This ensures that every provider you compare meets baseline quality and reliability standards.</p>`,
        `<p>After each completed booking, customers are invited to leave a verified review. These reviews cannot be edited or removed by providers, ensuring authentic feedback that helps you make better comparison decisions. Easy-Locs also monitors for fake reviews and takes action against any fraudulent activity to maintain the integrity of the comparison data.</p></section>`,
        `<section class="seo-section"><h2>Making Your Final Decision</h2>`,
        `<p>After comparing ${esc(svc.label.toLowerCase())} providers in ${esc(city.name)}, consider these final steps before booking: check provider availability for your preferred date and time, review the cancellation policy for flexibility, read the three most recent reviews for current service quality, and verify that the provider covers your specific location within ${esc(city.name)}. Once you have made your choice, book directly through Easy-Locs for instant confirmation and secure payment in ${esc(country.currency)}.</p></section>`,
        faqHtml([
          { q: `How do I compare ${svc.label.toLowerCase()} providers in ${city.name}?`, a: `Use Easy-Locs comparison tools to view providers side-by-side. Filter by rating, price, availability, and distance. Request quotes from multiple providers at once and compare proposals.` },
          { q: `How many ${svc.label.toLowerCase()} providers are in ${city.name}?`, a: `Easy-Locs lists ${getProviderCount(city.slug, svc.slug)} verified ${svc.label.toLowerCase()} providers in ${city.name}. All rated and reviewed by real customers with transparent pricing.` },
          { q: `Can I get quotes from multiple ${svc.label.toLowerCase()} providers?`, a: `Yes. Request quotes from multiple ${svc.label.toLowerCase()} providers in ${city.name} simultaneously through Easy-Locs. Compare proposals, pricing, and availability side-by-side.` },
          { q: `Are prices transparent for ${svc.label.toLowerCase()} in ${city.name}?`, a: `Yes. All prices on Easy-Locs are shown in ${country.currency} before you book. No hidden fees or surprise charges. Total estimated costs include all fees.` },
          { q: `How are ${svc.label.toLowerCase()} providers verified?`, a: `All providers undergo identity verification, qualification checks, and ongoing performance monitoring. They must maintain minimum customer satisfaction ratings to remain on the platform.` },
        ]),
        relatedServicesLinks(svc.slug, city.slug),
        `<nav class="seo-hub-nav"><strong>More:</strong> <a href="${BASE_URL}/best/${svc.slug}/in/${city.slug}">Best ${esc(svc.label)}</a> · <a href="${BASE_URL}/services/${svc.slug}/in/${city.slug}">${esc(svc.label)} Services</a> · <a href="${BASE_URL}/guide/${city.slug}">${esc(city.name)} Guide</a> · <a href="${BASE_URL}/city/${city.slug}">${esc(city.name)} Hub</a></nav>`,
        `<section class="seo-cta"><a href="${BASE_URL}/signup">Compare ${esc(svc.label)} in ${esc(city.name)} — Get started free</a></section>`,
        `</article>`,
        `</div>`,
      ].join("\n");

      const compareCrumbs = [
        { name: "Easy-Locs", href: BASE_URL },
        { name: "Compare" },
        { name: svc.label, href: `${BASE_URL}/services/${svc.slug}` },
        { name: city.name, href: `${BASE_URL}/city/${city.slug}` },
      ];
      const compareFaqs = [
        { q: `How do I compare ${svc.label.toLowerCase()} providers in ${city.name}?`, a: `Use Easy-Locs comparison tools to view providers side-by-side. Filter by rating, price, and availability.` },
        { q: `How many ${svc.label.toLowerCase()} providers are in ${city.name}?`, a: `${getProviderCount(city.slug, svc.slug)} verified providers in ${city.name}.` },
      ];
      const compareJsonLd = {
        "@context": "https://schema.org",
        "@graph": [
          { "@type": "Service", name: `Compare ${svc.label} in ${city.name}`, serviceType: svc.label, description: desc, url: canonical, areaServed: { "@type": "City", name: city.name, containedInPlace: { "@type": "Country", name: country.name } }, provider: { "@id": `${BASE_URL}/#organization` } },
          buildBreadcrumbJsonLd(compareCrumbs),
          buildFaqJsonLd(compareFaqs),
          buildItemListJsonLd(`${svc.label} Providers in ${city.name}`, [
            { name: `Best ${svc.label} in ${city.name}`, url: `${BASE_URL}/best/${svc.slug}/in/${city.slug}` },
            { name: `${svc.label} in ${city.name}`, url: `${BASE_URL}/services/${svc.slug}/in/${city.slug}` },
            { name: `${city.name} Guide`, url: `${BASE_URL}/guide/${city.slug}` },
          ]),
        ],
      };

      routes.push({
        urlPath: `/compare/${svc.slug}/in/${city.slug}`,
        htmlFile: `compare/${svc.slug}/in/${city.slug}/index.html`,
        headMeta: buildHeadMeta({ title, description: desc, canonical, ogImage: ogImageForServiceCity(svc.slug, city.slug), jsonLd: compareJsonLd }),
        bodyContent: compareBody,
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
    // Content hub: city guides — phase1 cities only
    ...phase1Cities.map(c => `/guide/${c.slug}`),
    // Content hub: best-of pages — top 10 cities × top 8 services
    ...BUILD_SERVICE_CATEGORIES.slice(0, 8).flatMap(s => phase1Cities.slice(0, 10).map(c => `/best/${s.slug}/in/${c.slug}`)),
    // Content hub: compare pages — top 10 cities × top 8 services
    ...BUILD_SERVICE_CATEGORIES.slice(0, 8).flatMap(s => phase1Cities.slice(0, 10).map(c => `/compare/${s.slug}/in/${c.slug}`)),
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
    { name: "guide-city",            template: p => `${BASE_URL}/guide/${p.city}` },
    { name: "best-svc-city",         template: p => `${BASE_URL}/best/${p.service}/in/${p.city}` },
    { name: "compare-svc-city",      template: p => `${BASE_URL}/compare/${p.service}/in/${p.city}` },
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

        for (const route of routes) {
          const specRules = buildRouteSpeculationRules(route.urlPath);
          if (specRules) {
            route.headMeta += `\n  <script type="speculationrules">${JSON.stringify(specRules)}</script>`;
          }
        }

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

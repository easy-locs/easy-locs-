/**
 * SEO Meta Pipeline — resolve route → normalize → build meta → inject → store
 * Handles: title, description, canonical, og:image, hreflang alternates, JSON-LD
 */
import { useSeoStore } from "../seo.store";
import type { SeoCommandResult } from "../seo-dispatch";

const BASE = "https://www.easy-locs.com";

import { SUPPORTED_LOCALES } from "@/lib/i18n-advanced";

/**
 * Full supported locale list for hreflang injection, derived from the canonical
 * SUPPORTED_LOCALES registry (src/lib/i18n-advanced.ts).
 * Single-URL multilingual SPA: all locales share the same canonical URL.
 * x-default always points to the canonical (en) URL per Google spec.
 */
const HREFLANG_LOCALES: Array<{ lang: string }> = [
  ...SUPPORTED_LOCALES.map(lang => ({ lang })),
  { lang: "x-default" },
];

const ROUTE_META: Record<string, { title: string; description: string; ogImage?: string }> = {
  "/": {
    title: "Easy-Locs — Food, Services, Taxi, Hotel in One App",
    description: "Easy-Locs: order food, book taxis, find hotels, get deliveries and local services — all in one super app. Available in 190+ countries, 120+ currencies, 31 languages.",
    ogImage: `${BASE}/og-default.jpg`,
  },
  "/marketplace": {
    title: "Marketplace — Easy-Locs",
    description: "Browse local services, restaurants, shops and more on Easy-Locs marketplace.",
    ogImage: `${BASE}/og-default.jpg`,
  },
  "/orbit": {
    title: "Orbit Messenger — Easy-Locs",
    description: "Secure messaging for landlords, tenants and service providers.",
    ogImage: `${BASE}/og-default.jpg`,
  },
  "/radar": {
    title: "Radar — Discover Nearby — Easy-Locs",
    description: "Explore services, restaurants and shops around you with the Easy-Locs radar.",
    ogImage: `${BASE}/og-default.jpg`,
  },
};

const DEFAULT_OG_IMAGE = `${BASE}/og-default.jpg`;

/**
 * Build hreflang alternates for a canonical route.
 * All supported locales point to the same URL (single-URL multilingual SPA).
 * x-default always points to the canonical English URL.
 */
export function buildHreflangAlternates(
  canonicalUrl: string,
): Array<{ lang: string; url: string }> {
  return HREFLANG_LOCALES.map(({ lang }) => ({ lang, url: canonicalUrl }));
}

export function buildSeoMeta(
  route: string,
  entity?: any,
  locale?: string,
): {
  title: string;
  description: string;
  canonicalUrl: string | null;
  ogImage: string;
  jsonLd: Record<string, unknown> | null;
  hreflangAlternates: Array<{ lang: string; url: string }>;
} {
  const base = ROUTE_META[route] || ROUTE_META["/"]!;
  let title = base.title;
  let description = base.description;
  let ogImage = base.ogImage || DEFAULT_OG_IMAGE;
  let jsonLd: Record<string, unknown> | null = null;

  if (entity) {
    if (entity.title || entity.name) {
      title = `${entity.title || entity.name} — Easy-Locs`;
    }
    if (entity.description) {
      description = entity.description.slice(0, 155);
    }
    if (entity.ogImage || entity.image || entity.photo_url) {
      ogImage = entity.ogImage || entity.image || entity.photo_url;
    }
    if (entity.id) {
      jsonLd = {
        "@context": "https://schema.org",
        "@type": entity.entityType === "listing" ? "Product" : "LocalBusiness",
        name: entity.title || entity.name,
        description: entity.description || description,
        image: ogImage,
      };
    }
  }

  const canonicalUrl = `${BASE}${route}`;

  const hreflangAlternates = buildHreflangAlternates(canonicalUrl);

  return { title, description, canonicalUrl, ogImage, jsonLd, hreflangAlternates };
}

export async function seoMetaPipeline(
  route: string,
  entity?: any,
  locale?: string,
): Promise<SeoCommandResult> {
  const meta = buildSeoMeta(route, entity, locale);

  useSeoStore.getState().setMeta({
    title: meta.title,
    description: meta.description,
    canonicalUrl: meta.canonicalUrl,
    ogImage: meta.ogImage,
    jsonLd: meta.jsonLd,
    hreflangAlternates: meta.hreflangAlternates,
  });

  document.title = meta.title;

  const setMetaTag = (name: string, content: string, isProperty = false) => {
    const attr = isProperty ? "property" : "name";
    let el = document.querySelector(`meta[${attr}="${name}"]`);
    if (!el) {
      el = document.createElement("meta");
      el.setAttribute(attr, name);
      document.head.appendChild(el);
    }
    el.setAttribute("content", content);
  };

  setMetaTag("description", meta.description);
  setMetaTag("og:title", meta.title, true);
  setMetaTag("og:description", meta.description, true);
  setMetaTag("og:image", meta.ogImage, true);
  setMetaTag("og:image:width", "1200", true);
  setMetaTag("og:image:height", "630", true);
  setMetaTag("twitter:image", meta.ogImage);

  if (meta.canonicalUrl) {
    let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
    if (!link) {
      link = document.createElement("link");
      link.rel = "canonical";
      document.head.appendChild(link);
    }
    link.href = meta.canonicalUrl;
    setMetaTag("og:url", meta.canonicalUrl, true);
  }

  document.querySelectorAll('link[data-hreflang]').forEach(el => el.remove());
  for (const alt of meta.hreflangAlternates) {
    const link = document.createElement("link");
    link.rel = "alternate";
    link.setAttribute("hreflang", alt.lang);
    link.href = alt.url;
    link.setAttribute("data-hreflang", "true");
    document.head.appendChild(link);
  }

  return { ok: true };
}

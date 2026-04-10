/**
 * SEO Meta Pipeline — resolve route → normalize → build meta → inject → store
 */
import { useSeoStore } from "../seo.store";
import type { SeoCommandResult } from "../seo-dispatch";

const ROUTE_META: Record<string, { title: string; description: string }> = {
  "/": {
    title: "Easy-Locs — Property Management Software for Landlords Worldwide",
    description: "Manage rental properties worldwide. Leases, receipts, tenant portal, accounting — all-in-one platform.",
  },
  "/marketplace": {
    title: "Marketplace — Easy-Locs",
    description: "Browse local services, restaurants, shops and more on Easy-Locs marketplace.",
  },
  "/orbit": {
    title: "Orbit Messenger — Easy-Locs",
    description: "Secure messaging for landlords, tenants and service providers.",
  },
  "/radar": {
    title: "Radar — Discover Nearby — Easy-Locs",
    description: "Explore services, restaurants and shops around you with the Easy-Locs radar.",
  },
};

export function buildSeoMeta(
  route: string,
  entity?: any,
  locale?: string,
): { title: string; description: string; canonicalUrl: string | null; jsonLd: Record<string, unknown> | null } {
  const base = ROUTE_META[route] || ROUTE_META["/"]!;
  let title = base.title;
  let description = base.description;
  let jsonLd: Record<string, unknown> | null = null;

  // Entity-specific enrichment
  if (entity) {
    if (entity.title || entity.name) {
      title = `${entity.title || entity.name} — Easy-Locs`;
    }
    if (entity.description) {
      description = entity.description.slice(0, 155);
    }
    if (entity.id) {
      jsonLd = {
        "@context": "https://schema.org",
        "@type": entity.entityType === "listing" ? "Product" : "LocalBusiness",
        name: entity.title || entity.name,
        description: entity.description || description,
      };
    }
  }

  const canonicalUrl = typeof window !== "undefined"
    ? `${window.location.origin}${route}`
    : null;

  return { title, description, canonicalUrl, jsonLd };
}

export async function seoMetaPipeline(
  route: string,
  entity?: any,
  locale?: string,
): Promise<SeoCommandResult> {
  const meta = buildSeoMeta(route, entity, locale);

  // Update owner
  useSeoStore.getState().setMeta({
    title: meta.title,
    description: meta.description,
    canonicalUrl: meta.canonicalUrl,
    jsonLd: meta.jsonLd,
  });

  // Inject into DOM (OUTPUT)
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

  if (meta.canonicalUrl) {
    let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
    if (!link) {
      link = document.createElement("link");
      link.rel = "canonical";
      document.head.appendChild(link);
    }
    link.href = meta.canonicalUrl;
  }

  return { ok: true };
}

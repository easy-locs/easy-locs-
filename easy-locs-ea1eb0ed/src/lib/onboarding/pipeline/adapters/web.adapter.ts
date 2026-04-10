/**
 * web.adapter — Transforms raw web-scraped data into CanonicalShopV2.
 * Full provenance tracking and quality scoring.
 */
import type { CanonicalShopV2, CanonicalGeoEntity, QualityReport, CanonicalCardProjection, CanonicalRadarProjection } from "@/lib/domains/canonical-entities";

export interface WebRawMerchant {
  url?: string; name?: string; description?: string; address?: string;
  lat?: number; lng?: number; city?: string; country?: string; countryCode?: string;
  category?: string; phone?: string; email?: string; website?: string;
  rating?: number; logo?: string; coverImage?: string; images?: string[];
}

function buildGeo(raw: WebRawMerchant): CanonicalGeoEntity {
  const has = typeof raw.lat === "number" && typeof raw.lng === "number" && raw.lat !== 0;
  return {
    lat: has ? raw.lat! : 25.2048, lng: has ? raw.lng! : 55.2708,
    confidence: has ? 0.60 : 0, sourceProvenance: "web",
    precisionType: has ? "approximate" : "fallback",
    normalizedAddress: raw.address?.trim() || "", city: raw.city?.trim() || "",
    country: raw.country?.trim() || "", countryCode: raw.countryCode?.trim().toUpperCase() || "",
    fallbackApplied: !has,
  };
}

export function adaptWebMerchant(raw: WebRawMerchant): CanonicalShopV2 {
  const geo = buildGeo(raw); const now = new Date().toISOString();
  let score = 20; const missing: string[] = [];
  if (!raw.name) missing.push("name"); else score += 15;
  if (!raw.logo && !raw.coverImage) missing.push("media"); else score += 10;
  if (!raw.lat || !raw.lng) missing.push("geo"); else score += 10;
  if (!raw.phone && !raw.email) missing.push("contact"); else score += 5;
  const quality: QualityReport = {
    score: Math.min(100, score), missingFields: missing,
    geoConfidence: raw.lat && raw.lng ? 0.60 : 0,
    mediaQuality: (raw.logo || raw.coverImage) ? 40 : 0, menuCompleteness: 0,
    seoReadiness: raw.name && raw.description ? 60 : 20,
    status: score >= 70 ? "ready" : score >= 40 ? "review" : "draft",
  };
  const card: CanonicalCardProjection = {
    title: raw.name || "Unknown", subtitle: raw.category || raw.description?.slice(0, 60) || "",
    imageUrl: raw.coverImage || raw.logo, badgeLabels: [],
    ratingLabel: raw.rating ? `${raw.rating}` : undefined,
    locationLabel: geo.city || "Dubai", ctaLabel: "View",
  };
  const radar: CanonicalRadarProjection = {
    lat: geo.lat, lng: geo.lng, layerKey: "merchant", iconKey: "shop",
    color: "hsl(var(--muted-foreground))", intensity: 0.5,
    clusterable: true, popupTitle: raw.name || "Business", popupSubtitle: raw.category,
  };
  return {
    id: crypto.randomUUID(),
    slug: (raw.name || "unknown").toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 80),
    name: raw.name?.trim() || "Unknown", description: raw.description?.trim(),
    vertical: "retail", category: raw.category?.toLowerCase() || "general",
    geo, media: { logo: raw.logo, cover: raw.coverImage, gallery: raw.images || [] },
    contact: { phone: raw.phone, email: raw.email, website: raw.website || raw.url },
    hours: [], delivery: {},
    ratings: { average: raw.rating || 0, count: 0, source: "web" },
    tags: raw.category ? [raw.category] : [], badges: [], active: true, verified: false,
    rawSources: ["web"],
    provenance: { name: { source: "web", confidence: 0.70, updatedAt: now }, geo: { source: "web", confidence: 0.60, updatedAt: now } },
    mergeHistory: [], quality, cardProjection: card, radarProjection: radar,
  };
}

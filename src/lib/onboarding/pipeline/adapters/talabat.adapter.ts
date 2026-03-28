/**
 * talabat.adapter — Transforms raw Talabat data into CanonicalShopV2.
 * Full provenance tracking and quality scoring.
 */
import type { CanonicalShopV2, CanonicalGeoEntity, QualityReport, CanonicalCardProjection, CanonicalRadarProjection } from "@/lib/domains/canonical-entities";

export interface TalabatRawMerchant {
  id?: string; name?: string; description?: string; address?: string;
  lat?: number; lng?: number; city?: string; country?: string;
  cuisine?: string; rating?: number; reviewCount?: number;
  logo?: string; hero?: string; deliveryFee?: number; minOrder?: number;
}

function buildGeo(raw: TalabatRawMerchant): CanonicalGeoEntity {
  const has = typeof raw.lat === "number" && typeof raw.lng === "number" && raw.lat !== 0;
  return {
    lat: has ? raw.lat! : 25.2048, lng: has ? raw.lng! : 55.2708,
    confidence: has ? 0.80 : 0, sourceProvenance: "talabat",
    precisionType: has ? "address" : "fallback",
    normalizedAddress: raw.address?.trim() || "", city: raw.city?.trim() || "",
    country: raw.country?.trim() || "", countryCode: "", fallbackApplied: !has,
  };
}

export function adaptTalabatMerchant(raw: TalabatRawMerchant): CanonicalShopV2 {
  const geo = buildGeo(raw); const now = new Date().toISOString();
  let score = 25; const missing: string[] = [];
  if (!raw.name) missing.push("name"); else score += 15;
  if (!raw.logo && !raw.hero) missing.push("media"); else score += 10;
  if (!raw.lat || !raw.lng) missing.push("geo"); else score += 15;
  if (!raw.rating) missing.push("rating"); else score += 5;
  const quality: QualityReport = {
    score: Math.min(100, score), missingFields: missing,
    geoConfidence: raw.lat && raw.lng ? 0.80 : 0,
    mediaQuality: (raw.logo || raw.hero) ? 55 : 0, menuCompleteness: 0,
    seoReadiness: raw.name ? 50 : 20,
    status: score >= 70 ? "ready" : score >= 40 ? "review" : "draft",
  };
  const card: CanonicalCardProjection = {
    title: raw.name || "Unknown", subtitle: raw.cuisine || "",
    imageUrl: raw.hero || raw.logo, badgeLabels: raw.rating && raw.rating >= 4.5 ? ["Top Rated"] : [],
    priceLabel: raw.deliveryFee != null ? `${raw.deliveryFee} AED` : undefined,
    ratingLabel: raw.rating ? `${raw.rating}` : undefined,
    locationLabel: geo.city || "Dubai", ctaLabel: "Order",
  };
  const radar: CanonicalRadarProjection = {
    lat: geo.lat, lng: geo.lng, layerKey: "merchant", iconKey: "restaurant",
    color: "hsl(var(--warning))", intensity: Math.min(1, (raw.rating || 0) / 5),
    clusterable: true, popupTitle: raw.name || "Restaurant", popupSubtitle: raw.cuisine,
  };
  return {
    id: raw.id || crypto.randomUUID(),
    slug: (raw.name || "unknown").toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 80),
    name: raw.name?.trim() || "Unknown", description: raw.description?.trim(),
    vertical: "food", category: "restaurant", subcategory: raw.cuisine?.toLowerCase(),
    geo, media: { logo: raw.logo, cover: raw.hero, gallery: [] },
    contact: {}, hours: [], delivery: { fee: raw.deliveryFee, minOrder: raw.minOrder },
    ratings: { average: raw.rating || 0, count: raw.reviewCount || 0, source: "talabat" },
    tags: raw.cuisine ? [raw.cuisine] : [], badges: [], active: true, verified: false,
    rawSources: ["talabat"],
    provenance: { name: { source: "talabat", confidence: 0.85, updatedAt: now }, geo: { source: "talabat", confidence: 0.80, updatedAt: now } },
    mergeHistory: [], quality, cardProjection: card, radarProjection: radar,
  };
}

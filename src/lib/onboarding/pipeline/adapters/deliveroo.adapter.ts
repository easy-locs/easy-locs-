/**
 * deliveroo.adapter — Transforms raw Deliveroo data into CanonicalShopV2.
 * Full provenance tracking and quality scoring.
 */
import type { CanonicalShopV2, CanonicalProduct, CanonicalGeoEntity, QualityReport, CanonicalCardProjection, CanonicalRadarProjection } from "@/lib/domains/canonical-entities";

export interface DeliverooRawMerchant {
  id?: string;
  name?: string;
  description?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  city?: string;
  country?: string;
  cuisines?: string[];
  rating?: number;
  ratingCount?: number;
  logo?: string;
  coverImage?: string;
  deliveryFee?: number;
  minOrder?: number;
  estimatedDelivery?: number;
  menu?: { name?: string; description?: string; price?: number; currency?: string; image?: string; category?: string; available?: boolean }[];
}

function buildGeo(raw: DeliverooRawMerchant): CanonicalGeoEntity {
  const has = typeof raw.latitude === "number" && typeof raw.longitude === "number" && raw.latitude !== 0;
  return {
    lat: has ? raw.latitude! : 25.2048, lng: has ? raw.longitude! : 55.2708,
    confidence: has ? 0.85 : 0, sourceProvenance: "deliveroo",
    precisionType: has ? "address" : "fallback",
    normalizedAddress: raw.address?.trim() || "", city: raw.city?.trim() || "",
    country: raw.country?.trim() || "", countryCode: "", fallbackApplied: !has,
  };
}

function buildQuality(raw: DeliverooRawMerchant): QualityReport {
  let score = 30; const missing: string[] = [];
  if (!raw.name) missing.push("name"); else score += 15;
  if (!raw.logo && !raw.coverImage) missing.push("media"); else score += 10;
  if (!raw.latitude || !raw.longitude) missing.push("geo"); else score += 15;
  if (!raw.menu?.length) missing.push("menu"); else score += 15;
  if (!raw.rating) missing.push("rating"); else score += 5;
  return {
    score: Math.min(100, score), missingFields: missing,
    geoConfidence: raw.latitude && raw.longitude ? 0.85 : 0,
    mediaQuality: (raw.logo || raw.coverImage) ? 60 : 0,
    menuCompleteness: raw.menu?.length ? Math.min(100, raw.menu.length * 10) : 0,
    seoReadiness: raw.name && raw.description ? 70 : 30,
    status: score >= 70 ? "ready" : score >= 40 ? "review" : "draft",
  };
}

export function adaptDeliverooMerchant(raw: DeliverooRawMerchant): CanonicalShopV2 {
  const geo = buildGeo(raw); const quality = buildQuality(raw);
  const now = new Date().toISOString();
  const card: CanonicalCardProjection = {
    title: raw.name || "Unknown", subtitle: raw.cuisines?.join(", ") || "",
    imageUrl: raw.coverImage || raw.logo,
    badgeLabels: raw.rating && raw.rating >= 4.5 ? ["Top Rated"] : [],
    priceLabel: raw.deliveryFee != null ? `${raw.deliveryFee} AED delivery` : undefined,
    ratingLabel: raw.rating ? `${raw.rating}` : undefined,
    locationLabel: geo.city || "Dubai", ctaLabel: "Order",
  };
  const radar: CanonicalRadarProjection = {
    lat: geo.lat, lng: geo.lng, layerKey: "merchant", iconKey: "restaurant",
    color: "hsl(var(--accent))", intensity: Math.min(1, (raw.rating || 0) / 5),
    clusterable: true, popupTitle: raw.name || "Restaurant",
    popupSubtitle: raw.cuisines?.slice(0, 2).join(", "),
  };
  return {
    id: raw.id || crypto.randomUUID(),
    slug: (raw.name || "unknown").toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 80),
    name: raw.name?.trim() || "Unknown", description: raw.description?.trim(),
    vertical: "food", category: "restaurant", subcategory: raw.cuisines?.[0]?.toLowerCase(),
    geo, media: { logo: raw.logo, cover: raw.coverImage, gallery: [] },
    contact: {}, hours: [],
    delivery: { fee: raw.deliveryFee, minOrder: raw.minOrder, estimatedMinutes: raw.estimatedDelivery },
    ratings: { average: raw.rating || 0, count: raw.ratingCount || 0, source: "deliveroo" },
    tags: raw.cuisines || [], badges: [], active: true, verified: false,
    rawSources: ["deliveroo"],
    provenance: { name: { source: "deliveroo", confidence: 0.9, updatedAt: now }, geo: { source: "deliveroo", confidence: 0.85, updatedAt: now } },
    mergeHistory: [], quality, cardProjection: card, radarProjection: radar,
  };
}

export function adaptDeliverooProducts(items: NonNullable<DeliverooRawMerchant["menu"]>): CanonicalProduct[] {
  return items.filter(i => i.name?.trim()).map((item, idx) => ({
    id: crypto.randomUUID(), name: item.name!.trim(), description: item.description?.trim(),
    price: item.price || 0, currency: item.currency || "AED", category: item.category,
    imageUrl: item.image, available: item.available !== false, sortOrder: idx,
  }));
}

/**
 * careem.adapter — Transforms raw Careem data into CanonicalShopV2.
 * Full V2: provenance tracking, quality scoring, card+radar projections.
 */
import type { CanonicalShopV2, CanonicalGeoEntity, QualityReport, CanonicalCardProjection, CanonicalRadarProjection } from "@/lib/domains/canonical-entities";

export interface CareemRawMerchant {
  id?: string; restaurant_id?: string;
  name?: string; title?: string; description?: string;
  address?: string; city?: string; country?: string;
  latitude?: number; longitude?: number;
  location?: { address?: string; city?: string; country?: string; lat?: number; lng?: number };
  cuisines?: string[]; categories?: string[];
  rating?: number; reviewCount?: number;
  logo_url?: string; logo?: string;
  hero_image?: string; cover_image?: string;
  images?: string[]; gallery?: string[];
  delivery_radius?: number; delivery_fee?: number; delivery_charge?: number;
  opening_hours?: { day?: string; day_of_week?: string; open?: string; opens_at?: string; close?: string; closes_at?: string }[];
  url?: string; source_url?: string;
  menu_items?: { name?: string; title?: string; price?: number; unit_price?: number; category?: string; section?: string; image?: string }[];
}

function buildGeo(raw: CareemRawMerchant): CanonicalGeoEntity {
  const lat = raw.latitude || raw.location?.lat || 0;
  const lng = raw.longitude || raw.location?.lng || 0;
  const has = lat !== 0 && lng !== 0;
  return {
    lat: has ? lat : 25.2048, lng: has ? lng : 55.2708,
    confidence: has ? 0.80 : 0, sourceProvenance: "careem",
    precisionType: has ? "address" : "fallback",
    normalizedAddress: raw.address || raw.location?.address || "",
    city: raw.city || raw.location?.city || "",
    country: raw.country || raw.location?.country || "",
    countryCode: "", fallbackApplied: !has,
  };
}

export function adaptCareemMerchant(raw: CareemRawMerchant): CanonicalShopV2 {
  const geo = buildGeo(raw);
  const now = new Date().toISOString();
  const cats = raw.cuisines || raw.categories || [];
  const logo = raw.logo_url || raw.logo;
  const cover = raw.hero_image || raw.cover_image;
  const gallery = raw.images || raw.gallery || [];

  let score = 25; const missing: string[] = [];
  if (!(raw.name || raw.title)) missing.push("name"); else score += 15;
  if (!logo && !cover) missing.push("media"); else score += 10;
  if (geo.fallbackApplied) missing.push("geo"); else score += 15;
  if (!raw.menu_items?.length) missing.push("menu"); else score += 15;
  if (!raw.rating) missing.push("rating"); else score += 5;
  const quality: QualityReport = {
    score: Math.min(100, score), missingFields: missing,
    geoConfidence: geo.fallbackApplied ? 0 : 0.80,
    mediaQuality: (logo || cover) ? 55 : 0,
    menuCompleteness: raw.menu_items?.length ? Math.min(100, raw.menu_items.length * 8) : 0,
    seoReadiness: (raw.name || raw.title) ? 50 : 20,
    status: score >= 70 ? "ready" : score >= 40 ? "review" : "draft",
  };
  const name = (raw.name || raw.title || "Unknown").trim();
  const card: CanonicalCardProjection = {
    title: name, subtitle: cats.join(", "),
    imageUrl: cover || logo, badgeLabels: raw.rating && raw.rating >= 4.5 ? ["Top Rated"] : [],
    priceLabel: (raw.delivery_fee ?? raw.delivery_charge) != null ? `${raw.delivery_fee ?? raw.delivery_charge} AED` : undefined,
    ratingLabel: raw.rating ? `${raw.rating}` : undefined,
    locationLabel: geo.city || "Dubai", ctaLabel: "Order",
  };
  const radar: CanonicalRadarProjection = {
    lat: geo.lat, lng: geo.lng, layerKey: "merchant", iconKey: "restaurant",
    color: "hsl(142 71% 45%)", intensity: Math.min(1, (raw.rating || 0) / 5),
    clusterable: true, popupTitle: name, popupSubtitle: cats.slice(0, 2).join(", "),
  };
  return {
    id: raw.id || raw.restaurant_id || crypto.randomUUID(),
    slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 80),
    name, description: raw.description?.trim(),
    vertical: "food", category: "restaurant", subcategory: cats[0]?.toLowerCase(),
    geo, media: { logo, cover, gallery },
    contact: {}, hours: (raw.opening_hours || []).map(h => ({
      day: h.day || h.day_of_week || "", open: h.open || h.opens_at || "", close: h.close || h.closes_at || "",
    })),
    delivery: { radius: raw.delivery_radius, fee: raw.delivery_fee ?? raw.delivery_charge },
    ratings: { average: raw.rating || 0, count: raw.reviewCount || 0, source: "careem" },
    tags: cats, badges: [], active: true, verified: false,
    rawSources: ["careem"],
    provenance: { name: { source: "careem", confidence: 0.85, updatedAt: now }, geo: { source: "careem", confidence: 0.80, updatedAt: now } },
    mergeHistory: [], quality, cardProjection: card, radarProjection: radar,
  };
}

/** Legacy-compat wrapper for pipeline consumers expecting async (raw) => CanonicalShop */
export async function careemAdapter(raw: any): Promise<any> {
  const r = adaptCareemMerchant(raw);
  return {
    id: r.id, name: r.name,
    location: { address: r.geo.normalizedAddress, city: r.geo.city, country: r.geo.country, lat: r.geo.lat, lng: r.geo.lng },
    categories: r.tags, products: (raw.menu_items || []).map((i: any) => ({ name: i.name || i.title || "", price: i.price || i.unit_price || 0, category: i.category || i.section })),
    media: r.media, hours: r.hours, delivery: r.delivery,
    source: { provider: "careem", url: raw.url || raw.source_url, confidence: 0.85 },
    quality: { score: r.quality.score, missingFields: r.quality.missingFields },
  };
}

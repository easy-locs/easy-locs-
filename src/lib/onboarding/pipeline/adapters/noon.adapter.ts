/**
 * noon.adapter — Transforms raw Noon/retail data into CanonicalShopV2.
 * Full V2: provenance tracking, quality scoring, card+radar projections.
 */
import type { CanonicalShopV2, CanonicalGeoEntity, QualityReport, CanonicalCardProjection, CanonicalRadarProjection } from "@/lib/domains/canonical-entities";

export interface NoonRawMerchant {
  id?: string; seller_id?: string;
  name?: string; store_name?: string; description?: string;
  address?: string; warehouse_address?: string;
  city?: string; country?: string;
  lat?: number; latitude?: number; lng?: number; longitude?: number;
  category?: string; categories?: string[];
  logo?: string; brand_logo?: string;
  cover?: string; banner?: string; images?: string[];
  shipping_fee?: number; delivery_fee?: number;
  rating?: number; reviewCount?: number;
  url?: string; source_url?: string;
  products?: { name?: string; title?: string; price?: number; sale_price?: number; category?: string; image?: string }[];
}

function buildGeo(raw: NoonRawMerchant): CanonicalGeoEntity {
  const lat = raw.lat || raw.latitude || 0;
  const lng = raw.lng || raw.longitude || 0;
  const has = lat !== 0 && lng !== 0;
  return {
    lat: has ? lat : 25.2048, lng: has ? lng : 55.2708,
    confidence: has ? 0.70 : 0, sourceProvenance: "noon",
    precisionType: has ? "approximate" : "fallback",
    normalizedAddress: raw.address || raw.warehouse_address || "",
    city: raw.city?.trim() || "", country: raw.country?.trim() || "",
    countryCode: "", fallbackApplied: !has,
  };
}

export function adaptNoonMerchant(raw: NoonRawMerchant): CanonicalShopV2 {
  const geo = buildGeo(raw);
  const now = new Date().toISOString();
  const cats = raw.categories || (raw.category ? [raw.category] : []);
  const logo = raw.logo || raw.brand_logo;
  const cover = raw.cover || raw.banner;

  let score = 20; const missing: string[] = [];
  if (!(raw.name || raw.store_name)) missing.push("name"); else score += 15;
  if (!logo && !cover) missing.push("media"); else score += 10;
  if (geo.fallbackApplied) missing.push("geo"); else score += 10;
  if (!raw.products?.length) missing.push("catalog"); else score += 15;
  if (!raw.rating) missing.push("rating"); else score += 5;
  const quality: QualityReport = {
    score: Math.min(100, score), missingFields: missing,
    geoConfidence: geo.fallbackApplied ? 0 : 0.70,
    mediaQuality: (logo || cover) ? 50 : 0,
    menuCompleteness: raw.products?.length ? Math.min(100, raw.products.length * 5) : 0,
    seoReadiness: (raw.name || raw.store_name) && raw.description ? 60 : 25,
    status: score >= 70 ? "ready" : score >= 40 ? "review" : "draft",
  };
  const name = (raw.name || raw.store_name || "Unknown").trim();
  const card: CanonicalCardProjection = {
    title: name, subtitle: cats.join(", ") || "Retail",
    imageUrl: cover || logo, badgeLabels: [],
    priceLabel: (raw.shipping_fee ?? raw.delivery_fee) != null ? `${raw.shipping_fee ?? raw.delivery_fee} AED shipping` : undefined,
    ratingLabel: raw.rating ? `${raw.rating}` : undefined,
    locationLabel: geo.city || "Dubai", ctaLabel: "Shop",
  };
  const radar: CanonicalRadarProjection = {
    lat: geo.lat, lng: geo.lng, layerKey: "merchant", iconKey: "shop",
    color: "hsl(48 96% 53%)", intensity: 0.6,
    clusterable: true, popupTitle: name, popupSubtitle: cats[0],
  };
  return {
    id: raw.id || raw.seller_id || crypto.randomUUID(),
    slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 80),
    name, description: raw.description?.trim(),
    vertical: "retail", category: raw.category?.toLowerCase() || "general",
    subcategory: cats[1]?.toLowerCase(),
    geo, media: { logo, cover, gallery: raw.images || [] },
    contact: {}, hours: [],
    delivery: { fee: raw.shipping_fee ?? raw.delivery_fee },
    ratings: { average: raw.rating || 0, count: raw.reviewCount || 0, source: "noon" },
    tags: cats, badges: [], active: true, verified: false,
    rawSources: ["noon"],
    provenance: { name: { source: "noon", confidence: 0.80, updatedAt: now }, geo: { source: "noon", confidence: 0.70, updatedAt: now } },
    mergeHistory: [], quality, cardProjection: card, radarProjection: radar,
  };
}

/** Legacy-compat wrapper for pipeline consumers expecting async (raw) => CanonicalShop */
export async function noonAdapter(raw: any): Promise<any> {
  const r = adaptNoonMerchant(raw);
  return {
    id: r.id, name: r.name,
    location: { address: r.geo.normalizedAddress, city: r.geo.city, country: r.geo.country, lat: r.geo.lat, lng: r.geo.lng },
    categories: r.tags, products: (raw.products || raw.catalog || []).map((p: any) => ({ name: p.name || p.title || "", price: p.price || p.sale_price || 0, category: p.category })),
    media: r.media, hours: [], delivery: r.delivery,
    source: { provider: "noon", url: raw.url || raw.source_url, confidence: 0.80 },
    quality: { score: r.quality.score, missingFields: r.quality.missingFields },
  };
}

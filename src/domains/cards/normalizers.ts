/**
 * Card Normalizers — Transform raw DB rows into canonical card entities.
 */
import type { CanonicalCardProjection } from "@/lib/domains/canonical-entities";

export interface NormalizedCardEntity {
  id: string;
  entityType: string;
  title: string;
  subtitle: string;
  imageUrl: string | null;
  badgeLabels: string[];
  rating: number | null;
  reviewCount: number | null;
  priceLabel: string | null;
  distance: string | null;
  eta: string | null;
  status: string;
  category: string | null;
  subcategory: string | null;
  lat: number | null;
  lng: number | null;
}

export function normalizeEntity(raw: any, entityType: string): NormalizedCardEntity {
  // If already has cardProjection (CanonicalShopV2 pattern)
  const projection: CanonicalCardProjection | undefined = raw.cardProjection;

  return {
    id: raw.id || raw.entity_id || "",
    entityType,
    title: projection?.title || raw.title || raw.name || "Unknown",
    subtitle: projection?.subtitle || raw.subtitle || raw.category || "",
    imageUrl: projection?.imageUrl || raw.image_url || raw.cover_url || raw.photo_url || null,
    badgeLabels: projection?.badgeLabels || raw.badges || [],
    rating: raw.rating ?? null,
    reviewCount: raw.review_count ?? null,
    priceLabel: projection?.priceLabel || raw.price_label || null,
    distance: projection?.distanceLabel || null,
    eta: raw.eta_label || null,
    status: raw.status || "active",
    category: raw.category || raw.canonical_vertical || null,
    subcategory: raw.subcategory || raw.canonical_subcategory || null,
    lat: raw.latitude ?? raw.lat ?? null,
    lng: raw.longitude ?? raw.lng ?? null,
  };
}

/**
 * Dual-Layer Image System
 * Resolves cover/logo with owner > auto > taxonomy fallback.
 * Tracks image source provenance.
 * All taxonomy fallbacks use generated SVG covers — zero external image dependencies.
 */
import { taxonomyCovers, verticalCovers } from "./category-covers";

export type ImageSource = "owner" | "system" | "google" | "ai" | "aggregator";

export interface ResolvedImage {
  url: string;
  source: ImageSource;
  isOwner: boolean;
}

/**
 * Deterministic index selection to avoid duplicates between nearby shops.
 * Uses shop ID hash to pick variant.
 */
function hashIndex(shopId: string, arrayLen: number): number {
  if (arrayLen <= 0) return 0;
  let hash = 0;
  for (let i = 0; i < shopId.length; i++) {
    hash = ((hash << 5) - hash + shopId.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % arrayLen;
}

/**
 * Resolve the cover image for a shop using dual-layer logic.
 * Priority: owner > auto/system > taxonomy fallback
 */
export function resolveCoverImage(shop: any): ResolvedImage {
  // Layer 1: Owner-uploaded
  if (shop.cover_owner_url) {
    return { url: shop.cover_owner_url, source: "owner", isOwner: true };
  }

  // Layer 2: Auto-generated or imported
  if (shop.cover_auto_url) {
    return { url: shop.cover_auto_url, source: (shop.cover_source as ImageSource) || "system", isOwner: false };
  }

  // Legacy fields
  if (shop.cover_url) {
    return { url: shop.cover_url, source: (shop.cover_source as ImageSource) || "system", isOwner: false };
  }
  if (shop.banner_url) {
    return { url: shop.banner_url, source: "system", isOwner: false };
  }
  if (shop.cover_image) {
    return { url: shop.cover_image, source: "system", isOwner: false };
  }

  // Layer 3: Taxonomy-aware fallback
  const fallbackUrl = getTaxonomyFallbackCover(shop);
  return { url: fallbackUrl, source: "system", isOwner: false };
}

/**
 * Resolve logo with dual-layer logic.
 */
export function resolveLogoImage(shop: any): ResolvedImage | null {
  if (shop.logo_owner_url) {
    return { url: shop.logo_owner_url, source: "owner", isOwner: true };
  }
  if (shop.logo_auto_url) {
    return { url: shop.logo_auto_url, source: (shop.cover_source as ImageSource) || "ai", isOwner: false };
  }
  if (shop.logo_url) {
    return { url: shop.logo_url, source: "system", isOwner: false };
  }
  if (shop.logo_image) {
    return { url: shop.logo_image, source: "system", isOwner: false };
  }
  return null;
}

/**
 * Get a taxonomy-aware fallback cover, unique per shop ID.
 */
export function getTaxonomyFallbackCover(shop: any): string {
  const shopId = shop.id || "default";
  const sub = shop.subcategory?.toLowerCase();
  const vertical = shop.vertical?.toLowerCase() || "services";

  if (sub) {
    const covers = taxonomyCovers(sub);
    return covers[hashIndex(shopId, covers.length)];
  }

  const vertCovers = verticalCovers(vertical);
  return vertCovers[hashIndex(shopId, vertCovers.length)];
}

/**
 * Check if a cover URL is a duplicate across nearby shops.
 */
export function isDuplicateCover(url: string, otherUrls: string[]): boolean {
  return otherUrls.filter(u => u === url).length > 1;
}

/**
 * Build provenance metadata for storage.
 */
export function buildProvenance(params: {
  sourceName?: string;
  sourceType?: string;
  sourceExternalId?: string;
  confidence?: number;
  fields?: Record<string, { source: string; confidence: number }>;
}): Record<string, any> {
  return {
    source_name: params.sourceName || null,
    source_type: params.sourceType || null,
    source_external_id: params.sourceExternalId || null,
    source_confidence: params.confidence || 0,
    field_provenance: params.fields || {},
    captured_at: new Date().toISOString(),
  };
}

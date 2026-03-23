/**
 * Dual-Layer Image System
 * Resolves cover/logo with owner > auto > taxonomy fallback.
 * Tracks image source provenance.
 */

export type ImageSource = "owner" | "system" | "google" | "ai" | "aggregator";

export interface ResolvedImage {
  url: string;
  source: ImageSource;
  isOwner: boolean;
}

// ── Taxonomy-aware fallback covers (per subcategory) ──
const TAXONOMY_COVERS: Record<string, string[]> = {
  pizza: [
    "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&q=80",
    "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&q=80",
    "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=800&q=80",
  ],
  burger: [
    "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&q=80",
    "https://images.unsplash.com/photo-1550547660-d9450f859349?w=800&q=80",
    "https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=800&q=80",
  ],
  sushi: [
    "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=800&q=80",
    "https://images.unsplash.com/photo-1553621042-f6e147245754?w=800&q=80",
    "https://images.unsplash.com/photo-1617196034796-73dfa7b1fd56?w=800&q=80",
  ],
  bakery: [
    "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&q=80",
    "https://images.unsplash.com/photo-1517433670267-08bbd4be890f?w=800&q=80",
    "https://images.unsplash.com/photo-1555507036-ab1f4038024a?w=800&q=80",
  ],
  cafe: [
    "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=800&q=80",
    "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&q=80",
    "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800&q=80",
  ],
  salon: [
    "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&q=80",
    "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&q=80",
  ],
  gym: [
    "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80",
    "https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=800&q=80",
  ],
  cleaning: [
    "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&q=80",
    "https://images.unsplash.com/photo-1628177142898-93e36e4e3a50?w=800&q=80",
  ],
};

const VERTICAL_COVERS: Record<string, string[]> = {
  food: [
    "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80",
    "https://images.unsplash.com/photo-1476224203421-9ac39bcb3327?w=800&q=80",
    "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80",
    "https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=800&q=80",
    "https://images.unsplash.com/photo-1543353071-087092ec169a?w=800&q=80",
  ],
  grocery: [
    "https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&q=80",
    "https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=800&q=80",
    "https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=800&q=80",
  ],
  shops: [
    "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&q=80",
    "https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=800&q=80",
    "https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=800&q=80",
  ],
  services: [
    "https://images.unsplash.com/photo-1521791136064-7986c2920216?w=800&q=80",
    "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&q=80",
    "https://images.unsplash.com/photo-1556745757-8d76bdb6984b?w=800&q=80",
  ],
  property: [
    "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80",
    "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=80",
  ],
  healthcare: [
    "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800&q=80",
    "https://images.unsplash.com/photo-1538108149393-fbbd81895907?w=800&q=80",
  ],
  mobility: [
    "https://images.unsplash.com/photo-1449965408869-ebd13bc0c72a?w=800&q=80",
  ],
  experiences: [
    "https://images.unsplash.com/photo-1506929562872-bb421503ef21?w=800&q=80",
    "https://images.unsplash.com/photo-1533105079780-92b9be482077?w=800&q=80",
  ],
};

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

  // Try subcategory-specific covers first
  if (sub && TAXONOMY_COVERS[sub]) {
    const covers = TAXONOMY_COVERS[sub];
    return covers[hashIndex(shopId, covers.length)];
  }

  // Vertical-level fallback
  const vertCovers = VERTICAL_COVERS[vertical] || VERTICAL_COVERS.services;
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

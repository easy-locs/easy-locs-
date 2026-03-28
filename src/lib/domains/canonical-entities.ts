/**
 * canonical-entities — Universal canonical types for all domain entities.
 * Single source of truth for import, cards, radar, geo, SEO projections.
 * Every imported entity must conform to these schemas before entering the app.
 */

// ── Field Provenance ──
export interface FieldProvenance {
  source: string;        // e.g. "deliveroo", "talabat", "web", "manual"
  confidence: number;    // 0–1
  updatedAt: string;     // ISO timestamp
  overriddenBy?: string; // source that won over
}

export interface ProvenanceMap {
  [fieldPath: string]: FieldProvenance;
}

// ── Merge History ──
export interface MergeRecord {
  mergedAt: string;
  sourceA: string;
  sourceB: string;
  fieldsKept: Record<string, string>; // field → winning source
  conflictsResolved: number;
}

// ── Quality Gate ──
export interface QualityReport {
  score: number;            // 0–100
  missingFields: string[];
  geoConfidence: number;    // 0–1
  mediaQuality: number;     // 0–100
  menuCompleteness: number; // 0–100
  seoReadiness: number;     // 0–100
  status: "draft" | "review" | "ready" | "published";
}

// ── Canonical Geo ──
export interface CanonicalGeoEntity {
  lat: number;
  lng: number;
  confidence: number;           // 0–1
  sourceProvenance: string;     // best source for this geo
  precisionType: "gps" | "address" | "approximate" | "fallback";
  normalizedAddress: string;
  city: string;
  country: string;
  countryCode: string;
  zone?: string;
  plusCode?: string;
  fallbackApplied: boolean;
}

// ── Canonical Product ──
export interface CanonicalProduct {
  id: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  category?: string;
  subcategory?: string;
  imageUrl?: string;
  variants?: { label: string; price: number; sku?: string }[];
  attributes?: Record<string, string | number | boolean>;
  available: boolean;
  sortOrder: number;
}

// ── Canonical Menu ──
export interface CanonicalMenuSection {
  id: string;
  title: string;
  sortOrder: number;
  items: CanonicalProduct[];
}

export interface CanonicalMenu {
  id: string;
  shopId: string;
  sections: CanonicalMenuSection[];
  lastUpdated: string;
  sourceProvenance: string;
  completeness: number; // 0–100
}

// ── Canonical Shop (extended) ──
export interface CanonicalShopV2 {
  id: string;
  slug: string;
  name: string;
  description?: string;
  vertical: string;
  category: string;
  subcategory?: string;
  geo: CanonicalGeoEntity;
  media: {
    logo?: string;
    cover?: string;
    gallery: string[];
  };
  contact: {
    phone?: string;
    email?: string;
    website?: string;
  };
  hours: { day: string; open: string; close: string }[];
  delivery: {
    radius?: number;
    fee?: number;
    minOrder?: number;
    estimatedMinutes?: number;
  };
  ratings: {
    average: number;
    count: number;
    source: string;
  };
  tags: string[];
  badges: string[];
  active: boolean;
  verified: boolean;

  // ── Provenance & Quality ──
  rawSources: string[];
  provenance: ProvenanceMap;
  mergeHistory: MergeRecord[];
  quality: QualityReport;

  // ── Projections (pre-computed for UI) ──
  cardProjection: CanonicalCardProjection;
  radarProjection: CanonicalRadarProjection;
}

// ── Card Projection ──
export interface CanonicalCardProjection {
  title: string;
  subtitle: string;
  imageUrl?: string;
  badgeLabels: string[];
  priceLabel?: string;
  ratingLabel?: string;
  distanceLabel?: string;
  locationLabel: string;
  ctaLabel?: string;
  ctaRoute?: string;
}

// ── Radar Projection ──
export interface CanonicalRadarProjection {
  lat: number;
  lng: number;
  layerKey: string;      // "merchant" | "driver" | "listing" | "zone"
  iconKey: string;
  color: string;
  intensity: number;      // 0–1 for heatmaps
  clusterable: boolean;
  popupTitle: string;
  popupSubtitle?: string;
}

// ── Canonical Order ──
export interface CanonicalOrder {
  id: string;
  shopId: string;
  customerId: string;
  status: string;
  items: { productId: string; name: string; qty: number; unitPrice: number }[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  currency: string;
  geo: {
    pickup: CanonicalGeoEntity;
    dropoff: CanonicalGeoEntity;
  };
  timeline: { event: string; at: string; actor?: string }[];
  createdAt: string;
  updatedAt: string;
}

// ── Canonical Booking ──
export interface CanonicalBooking {
  id: string;
  entityType: "hotel" | "service" | "activity" | "property";
  entityId: string;
  customerId: string;
  status: string;
  checkIn?: string;
  checkOut?: string;
  scheduledAt?: string;
  guestCount: number;
  totalAmount: number;
  currency: string;
  geo: CanonicalGeoEntity;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// ── Canonical Listing ──
export interface CanonicalListing {
  id: string;
  title: string;
  description?: string;
  entityType: "property" | "hotel" | "activity" | "service";
  price: number;
  currency: string;
  geo: CanonicalGeoEntity;
  media: { url: string; type: "image" | "video"; order: number }[];
  features: string[];
  active: boolean;
  slug: string;
  seoTitle?: string;
  seoDescription?: string;
  quality: QualityReport;
  cardProjection: CanonicalCardProjection;
  radarProjection: CanonicalRadarProjection;
}

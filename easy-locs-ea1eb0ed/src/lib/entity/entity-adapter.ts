/**
 * ENTITY ADAPTER — Canonical Platform Entity with 4 Separated Layers
 * ====================================================================
 * Layer 1: Identity   — entity_id, slug, type, owner (STABLE, PERMANENT)
 * Layer 2: Geography  — country, city, district, area, lat/lng, coverage
 * Layer 3: Taxonomy   — vertical, cluster, subcategory, tags, service_modes
 * Layer 4: Capability — wallet, qr, chat, booking, delivery, subscription
 *
 * entity_id is globally stable and NEVER derived from taxonomy or geography.
 */

import { db } from "@/services/db";

// ═══════════════════════════════════════════════════════════
//  LAYER 1 — IDENTITY (stable, permanent)
// ═══════════════════════════════════════════════════════════

export interface EntityIdentity {
  id: string;           // The ONE universal entity_id (UUID)
  entityType: EntityType;
  slug?: string | null;
  name: string;
  logoUrl?: string | null;
  bannerUrl?: string | null;
  ownerUserId?: string | null;
  orgId?: string | null;
  status: string;
  verified: boolean;
  createdAt: string;
  updatedAt: string;
  /** Parent entity for multi-location (brand → locations) */
  parentEntityId?: string | null;
  // Backward compat links (phase-out over time)
  storefrontPageId?: string | null;
  seedMerchantId?: string | null;
}

export type EntityType = "business" | "brand" | "driver" | "partner_network" | "individual";

// ═══════════════════════════════════════════════════════════
//  LAYER 2 — GEOGRAPHY (canonical, separate from identity)
// ═══════════════════════════════════════════════════════════

export interface EntityGeography {
  countryCode: string;   // ISO 3166-1 alpha-2
  countryName?: string | null;
  regionCode?: string | null;
  regionName?: string | null;
  cityCode?: string | null;     // normalized slug e.g. "dubai", "abu-dhabi"
  cityName?: string | null;
  districtCode?: string | null; // normalized slug e.g. "marina", "downtown"
  districtName?: string | null;
  area?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  /** point | district | city | country */
  coverageType: string;
}

// ═══════════════════════════════════════════════════════════
//  LAYER 3 — TAXONOMY (classification, separate from identity)
// ═══════════════════════════════════════════════════════════

export interface EntityTaxonomy {
  vertical?: string | null;
  cluster?: string | null;
  subcategory?: string | null;
  tags: string[];
  serviceModes: string[]; // e.g. ["dine_in","delivery","pickup"]
}

// ═══════════════════════════════════════════════════════════
//  LAYER 4 — CAPABILITY (system features, separate from taxonomy)
// ═══════════════════════════════════════════════════════════

export interface EntityCapability {
  wallet: boolean;
  qr: boolean;
  chat: boolean;
  call: boolean;
  booking: boolean;
  delivery: boolean;
  subscription: boolean;
}

// ═══════════════════════════════════════════════════════════
//  COMPOSITE — Full Platform Entity
// ═══════════════════════════════════════════════════════════

export interface PlatformEntity extends EntityIdentity {
  geo: EntityGeography;
  taxonomy: EntityTaxonomy;
  capabilities: EntityCapability;
  // Quality signals (flat for ranking compatibility)
  rating: number;
  reviewCount: number;
  orderCount: number;
  // Contact
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  website?: string | null;
  // World-readiness
  defaultLanguage?: string | null;
  timezone?: string | null;
  currency?: string | null;
  openingHours?: Record<string, any> | null;
  socialLinks?: Record<string, string> | null;
  // Commercial
  boostTier?: string | null;
  boostUntil?: string | null;
  partnerNetworkId?: string | null;
}

// ═══════════════════════════════════════════════════════════
//  ROW → ENTITY MAPPER
// ═══════════════════════════════════════════════════════════

function rowToEntity(row: any): PlatformEntity {
  return {
    // Layer 1: Identity
    id: row.id,
    entityType: row.entity_type ?? "business",
    name: row.name,
    slug: row.slug,
    logoUrl: row.logo_url,
    bannerUrl: row.banner_url,
    ownerUserId: row.owner_user_id,
    orgId: row.org_id,
    storefrontPageId: row.storefront_page_id,
    seedMerchantId: row.seed_merchant_id,
    parentEntityId: row.parent_entity_id ?? null,
    status: row.status ?? "active",
    verified: row.verified ?? false,
    createdAt: row.created_at,
    updatedAt: row.updated_at,

    // Layer 2: Geography
    geo: {
      countryCode: row.country_code ?? "AE",
      countryName: row.country_name ?? null,
      regionCode: row.region_code ?? null,
      regionName: row.region_name ?? null,
      cityCode: row.city_code ?? null,
      cityName: row.city_name ?? row.city ?? null,
      districtCode: row.district_code ?? null,
      districtName: row.district_name ?? null,
      area: row.area ?? null,
      address: row.address ?? null,
      latitude: row.latitude ? Number(row.latitude) : null,
      longitude: row.longitude ? Number(row.longitude) : null,
      coverageType: row.coverage_type ?? "hyperlocal",
    },

    // Layer 3: Taxonomy
    taxonomy: {
      vertical: row.vertical ?? null,
      cluster: row.cluster ?? null,
      subcategory: row.subcategory ?? null,
      tags: row.tags ?? [],
      serviceModes: row.service_modes ?? [],
    },

    // Layer 4: Capabilities
    capabilities: {
      wallet: row.cap_wallet ?? false,
      qr: row.cap_qr ?? false,
      chat: row.cap_chat ?? false,
      call: row.cap_call ?? false,
      booking: row.cap_booking ?? false,
      delivery: row.cap_delivery ?? false,
      subscription: row.cap_subscription ?? false,
    },

    // Quality
    rating: Number(row.rating ?? 0),
    reviewCount: row.review_count ?? 0,
    orderCount: row.order_count ?? 0,

    // Contact
    phone: row.phone,
    whatsapp: row.whatsapp,
    email: row.email,
    website: row.website,

    // World-readiness
    defaultLanguage: row.default_language ?? "en",
    timezone: row.timezone ?? null,
    currency: row.currency ?? "AED",
    openingHours: row.opening_hours ?? null,
    socialLinks: row.social_links ?? null,

    // Commercial
    boostTier: row.boost_tier,
    boostUntil: row.boost_until,
    partnerNetworkId: row.partner_network_id,
  };
}

// ═══════════════════════════════════════════════════════════
//  BRIDGING HELPERS — Convert PlatformEntity to ranking-engine
// ═══════════════════════════════════════════════════════════

import type { RankableEntity } from "@/lib/ranking-engine";

/** Bridge PlatformEntity → RankableEntity for unified scoring. */
export function toRankable(e: PlatformEntity): RankableEntity {
  return {
    id: e.id,
    entityType: e.entityType as any,
    vertical: e.taxonomy.vertical,
    cluster: e.taxonomy.cluster,
    subcategory: e.taxonomy.subcategory,
    tags: e.taxonomy.tags,
    rating: e.rating,
    reviewCount: e.reviewCount,
    orderCount: e.orderCount,
    lat: e.geo.latitude,
    lng: e.geo.longitude,
    districtCode: e.geo.districtCode,
    boostTier: e.boostTier,
    boostUntil: e.boostUntil,
    isSponsored: !!e.boostTier,
    profileScore: computeProfileScore(e),
    title: e.name,
  };
}

function computeProfileScore(e: PlatformEntity): number {
  let s = 0;
  if (e.rating > 0) s += 0.2;
  if (e.reviewCount > 0) s += 0.15;
  if (e.logoUrl) s += 0.2;
  if (e.bannerUrl) s += 0.1;
  if (e.taxonomy.subcategory) s += 0.15;
  if (e.phone || e.whatsapp) s += 0.1;
  if (e.geo.address) s += 0.1;
  return Math.min(1, s);
}

// ═══════════════════════════════════════════════════════════
//  FETCH HELPERS
// ═══════════════════════════════════════════════════════════

export async function fetchEntityById(entityId: string): Promise<PlatformEntity | null> {
  const { data, error } = await db
    .from("entities")
    .select("*")
    .eq("id", entityId)
    .maybeSingle();
  if (error || !data) return null;
  return rowToEntity(data);
}

export async function fetchEntityBySlug(slug: string): Promise<PlatformEntity | null> {
  const { data, error } = await db
    .from("entities")
    .select("*")
    .eq("slug", slug)
    .eq("status", "active")
    .maybeSingle();
  if (error || !data) return null;
  return rowToEntity(data);
}

export async function fetchEntitiesByVertical(opts: {
  vertical: string;
  subcategory?: string;
  city?: string;
  limit?: number;
}): Promise<PlatformEntity[]> {
  let query = db
    .from("entities")
    .select("*")
    .eq("status", "active")
    .eq("vertical", opts.vertical)
    .order("rating", { ascending: false })
    .limit(opts.limit ?? 100);
  if (opts.subcategory) query = query.eq("subcategory", opts.subcategory);
  if (opts.city) query = query.ilike("city", opts.city);
  const { data, error } = await query;
  if (error || !data) return [];
  return data.map(rowToEntity);
}

export async function fetchNearbyEntities(opts: {
  lat: number;
  lng: number;
  radiusKm?: number;
  vertical?: string;
  limit?: number;
}): Promise<PlatformEntity[]> {
  const r = opts.radiusKm ?? 10;
  const latDelta = r / 111;
  const lngDelta = r / (111 * Math.cos((opts.lat * Math.PI) / 180));
  let query = db
    .from("entities")
    .select("*")
    .eq("status", "active")
    .not("latitude", "is", null)
    .gte("latitude", opts.lat - latDelta)
    .lte("latitude", opts.lat + latDelta)
    .gte("longitude", opts.lng - lngDelta)
    .lte("longitude", opts.lng + lngDelta)
    .limit(opts.limit ?? 100);
  if (opts.vertical) query = query.eq("vertical", opts.vertical);
  const { data, error } = await query;
  if (error || !data) return [];
  return data.map(rowToEntity);
}

export async function searchEntities(query: string, limit = 20): Promise<PlatformEntity[]> {
  const { data, error } = await db
    .from("entities")
    .select("*")
    .eq("status", "active")
    .ilike("name", `%${query.trim()}%`)
    .order("rating", { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return data.map(rowToEntity);
}

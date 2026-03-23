/**
 * ENTITY ADAPTER — Bridges master `entities` table to the app.
 * ==============================================================
 * Provides typed access to the unified entity system.
 * All systems should progressively migrate to using entity_id.
 *
 * Current: reads from entities table, falls back to storefront_pages/seed_merchants.
 * Future: entities table becomes the ONLY source.
 */

import { supabase } from "@/integrations/supabase/client";

// ═══════════════════════════════════════════════════════════
//  CANONICAL ENTITY TYPE
// ═══════════════════════════════════════════════════════════

export interface PlatformEntity {
  id: string; // entity_id — the ONE universal ID
  entityType: "business" | "brand" | "driver" | "partner_network" | "individual";

  // Display
  name: string;
  slug?: string | null;
  logoUrl?: string | null;
  bannerUrl?: string | null;

  // Taxonomy
  vertical?: string | null;
  cluster?: string | null;
  subcategory?: string | null;
  tags: string[];

  // Geo
  latitude?: number | null;
  longitude?: number | null;
  address?: string | null;
  area?: string | null;
  city?: string | null;
  countryCode: string;

  // Contact
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  website?: string | null;

  // Quality
  rating: number;
  reviewCount: number;
  orderCount: number;

  // Ownership
  ownerUserId?: string | null;
  orgId?: string | null;

  // Source linking (backward compat)
  storefrontPageId?: string | null;
  seedMerchantId?: string | null;

  // Status
  status: string;
  verified: boolean;

  // Commercial
  boostTier?: string | null;
  boostUntil?: string | null;
  partnerNetworkId?: string | null;

  // Timestamps
  createdAt: string;
  updatedAt: string;
}

// ═══════════════════════════════════════════════════════════
//  FETCH HELPERS
// ═══════════════════════════════════════════════════════════

function rowToEntity(row: any): PlatformEntity {
  return {
    id: row.id,
    entityType: row.entity_type ?? "business",
    name: row.name,
    slug: row.slug,
    logoUrl: row.logo_url,
    bannerUrl: row.banner_url,
    vertical: row.vertical,
    cluster: row.cluster,
    subcategory: row.subcategory,
    tags: row.tags ?? [],
    latitude: row.latitude ? Number(row.latitude) : null,
    longitude: row.longitude ? Number(row.longitude) : null,
    address: row.address,
    area: row.area,
    city: row.city,
    countryCode: row.country_code ?? "AE",
    phone: row.phone,
    whatsapp: row.whatsapp,
    email: row.email,
    website: row.website,
    rating: Number(row.rating ?? 0),
    reviewCount: row.review_count ?? 0,
    orderCount: row.order_count ?? 0,
    ownerUserId: row.owner_user_id,
    orgId: row.org_id,
    storefrontPageId: row.storefront_page_id,
    seedMerchantId: row.seed_merchant_id,
    status: row.status ?? "active",
    verified: row.verified ?? false,
    boostTier: row.boost_tier,
    boostUntil: row.boost_until,
    partnerNetworkId: row.partner_network_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Fetch a single entity by ID. */
export async function fetchEntityById(entityId: string): Promise<PlatformEntity | null> {
  const { data, error } = await (supabase as any)
    .from("entities")
    .select("*")
    .eq("id", entityId)
    .maybeSingle();

  if (error || !data) return null;
  return rowToEntity(data);
}

/** Fetch a single entity by slug. */
export async function fetchEntityBySlug(slug: string): Promise<PlatformEntity | null> {
  const { data, error } = await (supabase as any)
    .from("entities")
    .select("*")
    .eq("slug", slug)
    .eq("status", "active")
    .maybeSingle();

  if (error || !data) return null;
  return rowToEntity(data);
}

/** Fetch entities by vertical with optional filters. */
export async function fetchEntitiesByVertical(opts: {
  vertical: string;
  subcategory?: string;
  city?: string;
  limit?: number;
}): Promise<PlatformEntity[]> {
  let query = (supabase as any)
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

/** Fetch nearby entities within a bounding box. */
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

  let query = (supabase as any)
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

/** Search entities by name. */
export async function searchEntities(query: string, limit = 20): Promise<PlatformEntity[]> {
  const { data, error } = await (supabase as any)
    .from("entities")
    .select("*")
    .eq("status", "active")
    .ilike("name", `%${query.trim()}%`)
    .order("rating", { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return data.map(rowToEntity);
}

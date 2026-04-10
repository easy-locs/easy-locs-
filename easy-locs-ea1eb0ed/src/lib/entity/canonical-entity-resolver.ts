/**
 * CANONICAL ENTITY RESOLVER — Single source of truth for entity navigation.
 * =========================================================================
 * Every component that opens a shop/hotel/service/merchant MUST use this.
 * Handles: storefront_pages, seed_merchants, hotels, stays.
 * Returns a canonical route string.
 */
import { db } from "@/services/db";

export interface CanonicalEntity {
  entityType: "storefront" | "seed" | "unknown";
  canonicalId: string;
  sourceTable: "storefront_pages" | "seed_merchants" | "none";
  slug: string | null;
  displayName: string;
  vertical: string | null;
  subcategory: string | null;
  visibility_mode: string | null;
  isSeed: boolean;
  routeTarget: string;
  logoUrl: string | null;
  coverUrl: string | null;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Build canonical route for any entity.
 * Always returns /s/{slug_or_id}
 */
export function buildEntityRoute(entity: { slug?: string | null; id: string }): string {
  return `/s/${entity.slug || entity.id}`;
}

/**
 * Build route from raw identifier (slug or UUID).
 */
export function buildEntityRouteFromId(slugOrId: string): string {
  return `/s/${slugOrId}`;
}

/**
 * Resolve a slug/id to a full canonical entity from the database.
 * Tries storefront_pages first, then seed_merchants.
 * This is the server-side resolution used by ShopPage.
 */
export async function resolveCanonicalEntity(slugOrId: string): Promise<CanonicalEntity> {
  const isUuid = UUID_RE.test(slugOrId);

  // 1. Try storefront_pages
  const sfQuery = db
    .from("storefront_pages")
    .select("id, slug, name, vertical, subcategory, visibility_mode, logo_url, banner_url")
    .limit(1);

  if (isUuid) sfQuery.eq("id", slugOrId);
  else sfQuery.eq("slug", slugOrId);

  const { data: sf } = await sfQuery.maybeSingle();
  if (sf) {
    return {
      entityType: "storefront",
      canonicalId: sf.id,
      sourceTable: "storefront_pages",
      slug: sf.slug,
      displayName: sf.name,
      vertical: sf.vertical,
      subcategory: sf.subcategory,
      visibility_mode: sf.visibility_mode,
      isSeed: false,
      routeTarget: `/s/${sf.slug || sf.id}`,
      logoUrl: sf.logo_url,
      coverUrl: sf.banner_url,
    };
  }

  // 2. Try seed_merchants by ID
  if (isUuid) {
    const { data: seed } = await db
      .from("seed_merchants")
      .select("id, name, category, subcategory, visibility_mode, logo_image, cover_image")
      .eq("id", slugOrId)
      .maybeSingle();

    if (seed) {
      return buildSeedEntity(seed);
    }
  }

  // 3. Try seed_merchants by name-derived slug
  if (!isUuid) {
    const nameGuess = slugOrId.replace(/-/g, " ");
    const { data: seed } = await db
      .from("seed_merchants")
      .select("id, name, category, subcategory, visibility_mode, logo_image, cover_image")
      .ilike("name", `%${nameGuess}%`)
      .limit(1)
      .maybeSingle();

    if (seed) {
      return buildSeedEntity(seed);
    }
  }

  // 4. Try fallback hotels
  try {
    const { FALLBACK_HOTELS } = await import("@/data/fallback-hotels");
    const hotel = FALLBACK_HOTELS.find(h => h.slug === slugOrId || h.id === slugOrId);
    if (hotel) {
      return {
        entityType: "seed" as const,
        canonicalId: hotel.id,
        sourceTable: "seed_merchants" as const,
        slug: hotel.slug,
        displayName: hotel.name,
        vertical: hotel.vertical,
        subcategory: hotel.subcategory,
        visibility_mode: hotel.visibility_mode,
        isSeed: true,
        routeTarget: `/s/${hotel.slug}`,
        logoUrl: hotel.logo_url,
        coverUrl: hotel.banner_url,
      };
    }
  } catch {}

  // 5. Not found
  return {
    entityType: "unknown",
    canonicalId: slugOrId,
    sourceTable: "none",
    slug: null,
    displayName: "Unknown",
    vertical: null,
    subcategory: null,
    visibility_mode: null,
    isSeed: false,
    routeTarget: `/s/${slugOrId}`,
    logoUrl: null,
    coverUrl: null,
  };
}

function buildSeedEntity(seed: any): CanonicalEntity {
  return {
    entityType: "seed",
    canonicalId: seed.id,
    sourceTable: "seed_merchants",
    slug: null,
    displayName: seed.name,
    vertical: seed.category,
    subcategory: seed.subcategory,
    visibility_mode: seed.visibility_mode || "coming_soon",
    isSeed: true,
    routeTarget: `/s/${seed.id}`,
    logoUrl: seed.logo_image,
    coverUrl: seed.cover_image,
  };
}

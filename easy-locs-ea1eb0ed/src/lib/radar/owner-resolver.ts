/**
 * OwnerResolver — Resolves a radar entity (business/listing) to its ownerUserId.
 * Used by the Pay button to navigate to Wallet with the correct recipient.
 *
 * Resolution order:
 * 1. storefront_pages  (owner_id)
 * 2. marketplace_listings (created_by preferred; org_id as secondary)
 * 3. property_listings / hotel_listings (owner_id / user_id)
 * 4. profiles (self-referential for user entities)
 */
import { db as supabase } from "@/services/db";

export type EntityOwnerResult =
  | { ownerUserId: string; ownerName: string | null; method: string }
  | null;

const resolverCache = new Map<string, EntityOwnerResult>();

export async function resolveEntityOwner(
  entityId: string,
  entityType?: string,
): Promise<EntityOwnerResult> {
  const cacheKey = `${entityId}:${entityType ?? ""}`;
  if (resolverCache.has(cacheKey)) return resolverCache.get(cacheKey)!;

  // 1. Storefront (shops, food, merchants)
  try {
    const { data: sf } = await supabase
      .from("storefront_pages")
      .select("owner_id, display_name")
      .eq("id", entityId)
      .maybeSingle();
    if (sf?.owner_id) {
      const result: EntityOwnerResult = {
        ownerUserId: sf.owner_id,
        ownerName: sf.display_name ?? null,
        method: "storefront",
      };
      resolverCache.set(cacheKey, result);
      return result;
    }
  } catch (_) {}

  // 2. Marketplace listings
  try {
    const { data: ml } = await supabase
      .from("marketplace_listings")
      .select("org_id, created_by, title")
      .eq("id", entityId)
      .maybeSingle();
    if (ml?.created_by || ml?.org_id) {
      const ownerUserId = (ml.created_by || ml.org_id) as string;
      const result: EntityOwnerResult = {
        ownerUserId,
        ownerName: ml.title ?? null,
        method: "marketplace",
      };
      resolverCache.set(cacheKey, result);
      return result;
    }
  } catch (_) {}

  // 3. Property listings
  try {
    const { data: prop } = await supabase
      .from("property_listings")
      .select("user_id, title")
      .eq("id", entityId)
      .maybeSingle();
    if (prop?.user_id) {
      const result: EntityOwnerResult = {
        ownerUserId: prop.user_id,
        ownerName: prop.title ?? null,
        method: "property",
      };
      resolverCache.set(cacheKey, result);
      return result;
    }
  } catch (_) {}

  // 4. Profiles (direct user entity)
  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, display_name, full_name")
      .eq("id", entityId)
      .maybeSingle();
    if (profile?.id) {
      const result: EntityOwnerResult = {
        ownerUserId: profile.id,
        ownerName: profile.display_name || profile.full_name || null,
        method: "profile",
      };
      resolverCache.set(cacheKey, result);
      return result;
    }
  } catch (_) {}

  resolverCache.set(cacheKey, null);
  return null;
}

/** Clear cache for an entity (e.g. after ownership change) */
export function clearOwnerCache(entityId: string) {
  for (const key of resolverCache.keys()) {
    if (key.startsWith(`${entityId}:`)) resolverCache.delete(key);
  }
}

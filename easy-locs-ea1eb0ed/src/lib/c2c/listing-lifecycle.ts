/**
 * C2C Listing Lifecycle — Expiry management and notifications.
 *
 * All client-side operations are scoped to the current authenticated user.
 * checkExpiringListings + archiveExpiredListings are user-scoped (RLS + explicit filter).
 */
import { db } from "@/services/db";
import { platformBus } from "@/lib/shared/platform-bus";

const EXPIRY_WARNING_DAYS = 3;
const RENEWAL_DAYS = 30;

export interface ListingLifecycleRow {
  id: string;
  title: string;
  user_id: string;
  listing_expires_at: string;
  status: string;
  auto_expire: boolean;
}

/**
 * Check for the current user's listings expiring soon and emit c2c:listing_expiry events.
 * User-scoped: only processes listings belonging to the given userId.
 */
export async function checkExpiringListings(userId: string): Promise<void> {
  if (!userId) return;

  const warningCutoff = new Date(Date.now() + EXPIRY_WARNING_DAYS * 86400 * 1000).toISOString();
  const now = new Date().toISOString();

  const { data: expiring, error } = await db
    .from("marketplace_services")
    .select("id, title, user_id, listing_expires_at, status, auto_expire")
    .eq("user_id", userId)
    .eq("active", true)
    .eq("status", "published")
    .eq("auto_expire", true)
    .lte("listing_expires_at", warningCutoff)
    .gte("listing_expires_at", now)
    .limit(50);

  if (error || !expiring) return;

  for (const listing of expiring as ListingLifecycleRow[]) {
    const daysLeft = Math.ceil(
      (new Date(listing.listing_expires_at).getTime() - Date.now()) / 86400000
    );

    platformBus.emit("c2c:listing_expiry", {
      type: "c2c:listing_expiry",
      payload: {
        sellerId: listing.user_id,
        listingTitle: listing.title,
        listingId: listing.id,
        daysLeft,
      },
    });
  }
}

/**
 * Archive the current user's listings that have fully expired.
 * User-scoped: only processes listings belonging to the given userId.
 */
export async function archiveExpiredListings(userId: string): Promise<number> {
  if (!userId) return 0;

  const now = new Date().toISOString();

  const { data: expired, error } = await db
    .from("marketplace_services")
    .select("id")
    .eq("user_id", userId)
    .eq("active", true)
    .eq("auto_expire", true)
    .lt("listing_expires_at", now)
    .limit(50);

  if (error || !expired || expired.length === 0) return 0;

  const ids = (expired as { id: string }[]).map(l => l.id);

  const { error: updateErr } = await db
    .from("marketplace_services")
    .update({ active: false, status: "archived" })
    .eq("user_id", userId)
    .in("id", ids);

  if (updateErr) return 0;

  return ids.length;
}

/**
 * Renew a listing for the specified duration (default 30 days).
 */
export async function renewListing(listingId: string, durationDays: number = RENEWAL_DAYS): Promise<void> {
  const days = durationDays === 60 ? 60 : 30;
  const newExpiry = new Date(Date.now() + days * 86400 * 1000).toISOString();
  const { error } = await db
    .from("marketplace_services")
    .update({
      listing_expires_at: newExpiry,
      active: true,
      status: "published",
    })
    .eq("id", listingId);

  if (error) throw error;
}

/**
 * Emit price-drop events to all followers of a listing.
 * Queries the user_favorites table for c2c_listing followers, then emits
 * one c2c:price_drop event per follower so each receives a notification.
 */
export async function emitPriceDrop(listing: {
  id: string;
  title: string;
  oldPrice: number;
  newPrice: number;
  currency: string;
}): Promise<void> {
  if (listing.newPrice >= listing.oldPrice) return;

  const { getListingFollowerIds } = await import("@/lib/c2c/listing-followers");
  const followerIds = await getListingFollowerIds(listing.id);

  for (const followerId of followerIds) {
    platformBus.emit("c2c:price_drop", {
      type: "c2c:price_drop",
      payload: {
        followerId,
        listingId: listing.id,
        listingTitle: listing.title,
        oldPrice: listing.oldPrice,
        newPrice: listing.newPrice,
        currency: listing.currency,
      },
    });
  }
}

/**
 * Detect similar listings posted at a lower price and notify the seller.
 * Compares by category + brand/model overlap + lower price.
 * Call this when a new listing is published.
 */
export async function detectSimilarLowerPrice(newListing: {
  id: string;
  title: string;
  category: string;
  price: number;
  currency: string;
  brand?: string;
  model?: string;
}): Promise<void> {
  if (!newListing.category || !newListing.price) return;

  const { data: similar, error } = await db
    .from("marketplace_services")
    .select("id, title, price, user_id, brand, model")
    .eq("category", newListing.category)
    .eq("active", true)
    .eq("status", "published")
    .gt("price", newListing.price)
    .neq("id", newListing.id)
    .limit(50);

  if (error || !similar) return;

  const newBrand = (newListing.brand || "").toLowerCase().trim();
  const newModel = (newListing.model || "").toLowerCase().trim();
  const newTitleWords = newListing.title.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  const notifiedSellers = new Set<string>();

  for (const existing of similar as Array<{ id: string; title: string; price: number; user_id: string; brand?: string; model?: string }>) {
    if (notifiedSellers.has(existing.user_id)) continue;

    const existingBrand = (existing.brand || "").toLowerCase().trim();
    const existingModel = (existing.model || "").toLowerCase().trim();
    const existingTitle = existing.title.toLowerCase();

    const brandMatch = newBrand && existingBrand && newBrand === existingBrand;
    const modelMatch = newModel && existingModel && newModel === existingModel;
    const titleOverlap = newTitleWords.filter(w => existingTitle.includes(w)).length;
    const isSimilar = (brandMatch && modelMatch) || (brandMatch && titleOverlap >= 2) || titleOverlap >= 3;

    if (!isSimilar) continue;

    notifiedSellers.add(existing.user_id);

    platformBus.emit("c2c:similar_lower_price", {
      type: "c2c:similar_lower_price",
      payload: {
        sellerId: existing.user_id,
        sellerListingId: existing.id,
        sellerListingTitle: existing.title,
        sellerPrice: existing.price,
        competitorListingId: newListing.id,
        competitorTitle: newListing.title,
        competitorPrice: newListing.price,
        currency: newListing.currency,
      },
    });
  }
}

/**
 * Check saved searches and notify users when a new listing matches their criteria.
 * Call this when a new listing is published.
 */
export async function notifySavedSearchMatches(listing: {
  id: string;
  title: string;
  category: string;
  price: number;
  city: string;
  condition?: string;
}): Promise<void> {
  const { data: searches, error } = await db
    .from("saved_searches")
    .select("id, user_id, name, filters")
    .limit(500);

  if (error || !searches) return;

  for (const search of searches as Array<{ id: string; user_id: string; name: string; filters: Record<string, any> }>) {
    const { filters } = search;
    if (!filters) continue;

    const catMatch =
      !filters.category ||
      filters.category === "all" ||
      filters.category === listing.category;

    const queryMatch =
      !filters.query ||
      listing.title.toLowerCase().includes(String(filters.query).toLowerCase());

    const priceMatch = (() => {
      if (!filters.priceRange) return true;
      const [min, maxStr] = String(filters.priceRange).split("-");
      const minVal = parseInt(min);
      if (isNaN(minVal)) return true;
      if (maxStr === "+" || maxStr === undefined) return listing.price >= minVal;
      const maxVal = parseInt(maxStr);
      if (isNaN(maxVal)) return listing.price >= minVal;
      return listing.price >= minVal && listing.price <= maxVal;
    })();

    const conditionMatch =
      !filters.condition ||
      filters.condition === "all" ||
      filters.condition === listing.condition;

    const locationMatch =
      !filters.city ||
      listing.city.toLowerCase().includes(String(filters.city).toLowerCase());

    if (catMatch && queryMatch && priceMatch && conditionMatch && locationMatch) {
      platformBus.emit("c2c:saved_search_match", {
        type: "c2c:saved_search_match",
        payload: {
          userId: search.user_id,
          searchName: search.name,
          listingTitle: listing.title,
          listingId: listing.id,
        },
      });
    }
  }
}

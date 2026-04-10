/**
 * Listing Lifecycle Manager
 * Publish, republish, expire, archive, disable logic.
 */
import { db } from "@/services/db";

export type ListingType = "sale" | "service" | "shop";
export type ListingStatus = "draft" | "active" | "expired" | "archived" | "disabled";

interface PublishResult {
  success: boolean;
  error?: string;
}

/**
 * Publish a listing. Sets status to active and configures expiry based on type.
 */
export async function publishListing(listingId: string, listingType: ListingType): Promise<PublishResult> {
  const now = new Date().toISOString();
  const isSale = listingType === "sale";

  const update: Record<string, any> = {
    status: "published", // maps to the existing enum — active in our model
    active: true,
    published_at: now,
    auto_expire: isSale,
    listing_expires_at: isSale ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() : null,
    archived_at: null,
    updated_at: now,
  };

  const { error } = await db
    .from("marketplace_services")
    .update(update)
    .eq("id", listingId);

  return error ? { success: false, error: error.message } : { success: true };
}

/**
 * Republish a sale listing — resets 30-day clock + increments renewal_count.
 */
export async function republishListing(listingId: string): Promise<PublishResult> {
  const now = new Date().toISOString();
  const newExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  const { error } = await db
    .from("marketplace_services")
    .update({
      status: "published",
      active: true,
      published_at: now,
      auto_expire: true,
      listing_expires_at: newExpiry,
      last_renewed_at: now,
      archived_at: null,
      updated_at: now,
    })
    .eq("id", listingId);

  if (error) return { success: false, error: error.message };

  // Increment renewal count
  await db.rpc("increment_listing_renewal_count", { p_listing_id: listingId }).catch(() => {});

  return { success: true };
}

/**
 * Archive a listing manually.
 */
export async function archiveListing(listingId: string): Promise<PublishResult> {
  const now = new Date().toISOString();
  const { error } = await db
    .from("marketplace_services")
    .update({
      status: "archived",
      active: false,
      archived_at: now,
      updated_at: now,
    })
    .eq("id", listingId);

  return error ? { success: false, error: error.message } : { success: true };
}

/**
 * Disable a listing (manual off or parent deletion).
 */
export async function disableListing(listingId: string): Promise<PublishResult> {
  const { error } = await db
    .from("marketplace_services")
    .update({
      status: "archived", // closest to "disabled" in existing enum
      active: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", listingId);

  return error ? { success: false, error: error.message } : { success: true };
}

/**
 * Save as draft (not public).
 */
export async function saveDraft(listingId: string): Promise<PublishResult> {
  const { error } = await db
    .from("marketplace_services")
    .update({
      status: "draft",
      active: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", listingId);

  return error ? { success: false, error: error.message } : { success: true };
}

/**
 * Check if a listing is expired.
 */
export function isListingExpired(listing: { auto_expire?: boolean; listing_expires_at?: string | null }): boolean {
  if (!listing.auto_expire || !listing.listing_expires_at) return false;
  return new Date(listing.listing_expires_at).getTime() < Date.now();
}

/**
 * Get display status accounting for expiry.
 */
export function getDisplayStatus(listing: {
  status?: string;
  active?: boolean;
  auto_expire?: boolean;
  listing_expires_at?: string | null;
}): ListingStatus {
  if (isListingExpired(listing)) return "expired";
  if (!listing.active) {
    if (listing.status === "draft") return "draft";
    if (listing.status === "archived") return "archived";
    return "disabled";
  }
  return "active";
}

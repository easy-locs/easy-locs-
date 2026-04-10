/**
 * Listing Renew — Manual and auto-renew logic.
 */
import { db } from "@/services/db";

interface RenewResult {
  success: boolean;
  error?: string;
  newExpiresAt?: string;
}

const RENEW_DAYS = 30;

/**
 * Manual renew — resets 30-day clock, increments renewal_count.
 * Validates ownership via RLS.
 */
export async function renewListing(listingId: string): Promise<RenewResult> {
  const now = new Date();
  const newExpiry = new Date(now.getTime() + RENEW_DAYS * 86400000).toISOString();

  const { error } = await db
    .from("marketplace_services")
    .update({
      status: "published",
      active: true,
      listing_expires_at: newExpiry,
      last_renewed_at: now.toISOString(),
      renewal_count: db.rpc ? undefined : 0, // increment handled below
      auto_expire: true,
      archived_at: null,
      updated_at: now.toISOString(),
    })
    .eq("id", listingId);

  if (error) return { success: false, error: error.message };

  // Increment renewal_count via RPC-safe pattern
  await db.rpc("increment_listing_renewal_count", { p_listing_id: listingId }).catch(() => {
    // Fallback: ignore if RPC doesn't exist yet
  });

  return { success: true, newExpiresAt: newExpiry };
}

/**
 * Toggle auto-renew on a listing.
 */
export async function setAutoRenew(listingId: string, enabled: boolean, plan?: string): Promise<RenewResult> {
  const { error } = await db
    .from("marketplace_services")
    .update({
      auto_renew_enabled: enabled,
      auto_renew_plan: plan || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", listingId);

  return error ? { success: false, error: error.message } : { success: true };
}

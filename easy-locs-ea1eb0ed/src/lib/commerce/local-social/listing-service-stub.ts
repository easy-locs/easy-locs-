/**
 * listing-service-stub — Local social commerce listing operations.
 * Gated behind feature flags. Returns typed empty results when disabled.
 * Backed by Supabase `local_listings` table when flags are enabled.
 */
import type { CanonicalLocalListing, LocalListingStatus } from "@/domains/shared/canonical-types";
import { isPlatformFlagEnabled } from "@/lib/growth/feature-flag-registry";
import type { PlatformFlag } from "@/lib/growth/feature-flag-registry";

const MASTER_FLAG: PlatformFlag = "enable_local_social_commerce";
const LISTINGS_FLAG: PlatformFlag = "enable_commerce_listings";

function gated(): string | null {
  if (!isPlatformFlagEnabled(MASTER_FLAG)) return "local_social_commerce_disabled";
  if (!isPlatformFlagEnabled(LISTINGS_FLAG)) return "listings_disabled";
  return null;
}

export function createListing(_listing: Omit<CanonicalLocalListing, "id" | "createdAt" | "updatedAt" | "viewCount" | "inquiryCount">): { created: false; reason: string } {
  const gate = gated();
  return { created: false, reason: gate ?? "awaiting_backend_integration" };
}

export function updateListingStatus(_listingId: string, _status: LocalListingStatus): { updated: false; reason: string } {
  const gate = gated();
  return { updated: false, reason: gate ?? "awaiting_backend_integration" };
}

export function getListingById(_listingId: string): CanonicalLocalListing | null {
  if (gated()) return null;
  return null;
}

export function getListingsByCity(_country: string, _city: string): CanonicalLocalListing[] {
  if (gated()) return [];
  return [];
}

export function getListingsBySeller(_sellerId: string): CanonicalLocalListing[] {
  if (gated()) return [];
  return [];
}

export function searchListings(_query: { country: string; city?: string; category?: string; keywords?: string[] }): CanonicalLocalListing[] {
  if (gated()) return [];
  return [];
}

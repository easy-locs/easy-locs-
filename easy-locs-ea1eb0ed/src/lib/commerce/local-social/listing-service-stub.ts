import type { CanonicalLocalListing, LocalListingStatus } from "@/domains/shared/canonical-types";
import { isPlatformFlagEnabled } from "@/lib/growth/feature-flag-registry";
import type { PlatformFlag } from "@/lib/growth/feature-flag-registry";

const MASTER_FLAG: PlatformFlag = "enable_local_social_commerce";
const LISTINGS_FLAG: PlatformFlag = "enable_commerce_listings";

export function createListing(_listing: Omit<CanonicalLocalListing, "id" | "createdAt" | "updatedAt" | "viewCount" | "inquiryCount">): { created: false; reason: string } {
  if (!isPlatformFlagEnabled(MASTER_FLAG)) return { created: false, reason: "master_flag_off" };
  if (!isPlatformFlagEnabled(LISTINGS_FLAG)) return { created: false, reason: "listings_flag_off" };
  return { created: false, reason: "stub_not_implemented" };
}

export function updateListingStatus(_listingId: string, _status: LocalListingStatus): { updated: false; reason: string } {
  if (!isPlatformFlagEnabled(MASTER_FLAG)) return { updated: false, reason: "master_flag_off" };
  if (!isPlatformFlagEnabled(LISTINGS_FLAG)) return { updated: false, reason: "listings_flag_off" };
  return { updated: false, reason: "stub_not_implemented" };
}

export function getListingById(_listingId: string): CanonicalLocalListing | null {
  if (!isPlatformFlagEnabled(MASTER_FLAG)) return null;
  if (!isPlatformFlagEnabled(LISTINGS_FLAG)) return null;
  return null;
}

export function getListingsByCity(_country: string, _city: string): CanonicalLocalListing[] {
  if (!isPlatformFlagEnabled(MASTER_FLAG)) return [];
  return [];
}

export function getListingsBySeller(_sellerId: string): CanonicalLocalListing[] {
  if (!isPlatformFlagEnabled(MASTER_FLAG)) return [];
  return [];
}

export function searchListings(_query: { country: string; city?: string; category?: string; keywords?: string[] }): CanonicalLocalListing[] {
  if (!isPlatformFlagEnabled(MASTER_FLAG)) return [];
  return [];
}

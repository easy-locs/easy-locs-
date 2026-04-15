/**
 * Listing Boost — Enable/disable boost with multiplier and expiry.
 */
import { db } from "@/services/db";

interface BoostResult {
  success: boolean;
  error?: string;
}

export type BoostTier = "basic" | "premium" | "featured";

const BOOST_CONFIG: Record<BoostTier, { multiplier: number; durationDays: number }> = {
  basic: { multiplier: 1.2, durationDays: 7 },
  premium: { multiplier: 1.5, durationDays: 14 },
  featured: { multiplier: 2.0, durationDays: 30 },
};

/**
 * Activate boost on a listing.
 * In production, call this AFTER payment confirmation.
 */
export async function activateBoost(listingId: string, tier: BoostTier): Promise<BoostResult> {
  const config = BOOST_CONFIG[tier];
  const now = new Date();
  const expiresAt = new Date(now.getTime() + config.durationDays * 86400000).toISOString();

  const { error } = await db
    .from("real_estate_listings")
    .update({
      boost_enabled: true,
      boost_multiplier: config.multiplier,
      boost_expires_at: expiresAt,
      updated_at: now.toISOString(),
    })
    .eq("id", listingId);

  return error ? { success: false, error: error.message } : { success: true };
}

/**
 * Deactivate boost on a listing.
 */
export async function deactivateBoost(listingId: string): Promise<BoostResult> {
  const { error } = await db
    .from("real_estate_listings")
    .update({
      boost_enabled: false,
      boost_multiplier: 1.0,
      boost_expires_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", listingId);

  return error ? { success: false, error: error.message } : { success: true };
}

/** Check if boost is currently active */
export function isBoostActive(listing: {
  boost_enabled?: boolean;
  boost_expires_at?: string | null;
}): boolean {
  if (!listing.boost_enabled) return false;
  if (!listing.boost_expires_at) return false;
  return new Date(listing.boost_expires_at).getTime() > Date.now();
}

/** Get boost tier config */
export function getBoostConfig(tier: BoostTier) {
  return BOOST_CONFIG[tier];
}

/** Get all tiers for UI */
export function getBoostTiers(): { tier: BoostTier; label: string; multiplier: number; days: number }[] {
  return [
    { tier: "basic", label: "Basic Boost", multiplier: 1.2, days: 7 },
    { tier: "premium", label: "Premium Boost", multiplier: 1.5, days: 14 },
    { tier: "featured", label: "Featured", multiplier: 2.0, days: 30 },
  ];
}

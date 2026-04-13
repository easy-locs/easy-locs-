/**
 * Listing Checkout — Frontend helpers for paid renew/boost via Stripe Checkout.
 */
import { db as supabase } from "@/services/db";

export type BoostTier = "basic" | "premium" | "featured";

export const BOOST_TIER_INFO: Record<BoostTier, { label: string; priceAed: number; days: number; multiplier: number }> = {
  basic: { label: "Basic Boost", priceAed: 49, days: 7, multiplier: 1.2 },
  premium: { label: "Premium Boost", priceAed: 99, days: 14, multiplier: 1.5 },
  featured: { label: "Featured", priceAed: 199, days: 30, multiplier: 2.0 },
};

export const RENEWAL_PRICE_AED = 29;

interface CheckoutResult {
  success: boolean;
  url?: string;
  error?: string;
}

/**
 * Create Stripe Checkout for listing renewal.
 * Renew only activates after webhook payment confirmation.
 */
export async function createRenewalCheckout(listingId: string): Promise<CheckoutResult> {
  const { data, error } = await supabase.functions.invoke("create-listing-checkout", {
    body: { listingId, paymentType: "listing_renewal" },
  });
  if (error) return { success: false, error: error.message };
  if (data?.error) return { success: false, error: data.error };
  return { success: true, url: data.url };
}

/**
 * Create Stripe Checkout for listing boost.
 * Boost only activates after webhook payment confirmation.
 */
export async function createBoostCheckout(listingId: string, tier: BoostTier): Promise<CheckoutResult> {
  const { data, error } = await supabase.functions.invoke("create-listing-checkout", {
    body: { listingId, paymentType: "listing_boost", boostTier: tier },
  });
  if (error) return { success: false, error: error.message };
  if (data?.error) return { success: false, error: data.error };
  return { success: true, url: data.url };
}

import { useAuth } from "@/contexts/AuthContext";

/**
 * Subscription gating with free-tier features.
 *
 * FREE features (no subscription needed):
 * - Publishing unlimited listings (real_estate, marketplace, concierge, seasonal_listings, activities)
 * - Receiving messages & communication (messages, communication)
 * - Marketplace storefront & catalog
 *
 * PRO features (subscription required):
 * - Rental management, finances, documents, leases, interventions, calendar, etc.
 */

const FREE_FEATURES = new Set([
  // Listings & publishing
  "real_estate",
  "marketplace",
  "concierge",
  "seasonal_listings",
  "activities",
  "ota_sync",
  // Communication
  "messages",
  "communication",
  // Storefront
  "storefront",
  "catalog",
]);

export function useSubscriptionGating() {
  const { subscription } = useAuth();

  const isSubscribed = subscription.subscribed;
  const isLoading = subscription.loading;

  const canAccess = (feature: string): boolean => {
    if (isLoading) return true;
    if (FREE_FEATURES.has(feature)) return true;
    return isSubscribed;
  };

  const requiresUpgrade = (feature: string): "unlimited" | null => {
    if (isLoading) return null;
    if (FREE_FEATURES.has(feature)) return null;
    if (isSubscribed) return null;
    return "unlimited";
  };

  return {
    currentTier: isSubscribed ? "unlimited" : "free",
    canAccess,
    requiresUpgrade,
    isSubscribed,
    isFree: !isSubscribed,
    isLoading,
  };
}

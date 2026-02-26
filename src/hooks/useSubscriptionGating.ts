import { useAuth } from "@/contexts/AuthContext";

export type FeatureTier = "local" | "global" | "free";

/**
 * Maps subscription plan keys to their tier.
 * Local plans: local_monthly, local_annual, trial
 * Global plans: global_monthly, global_annual
 */
function planToTier(plan: string): FeatureTier {
  if (plan.startsWith("global")) return "global";
  if (plan.startsWith("local") || plan === "trial") return "local";
  return "free";
}

/** Features that require the Global tier */
const GLOBAL_ONLY_FEATURES = new Set([
  "multi_country",
  "international_signature",
  "long_term_archiving",
  "legal_pdf_export",
  "priority_support",
  "ota_sync",
  "multi_currency",
]);

/** Features available on Local tier and above */
const LOCAL_FEATURES = new Set([
  "unlimited_properties",
  "unlimited_tenants",
  "long_term_rental",
  "airbnb_booking_sync",
  "legal_documents",
  "inventory",
  "receipts",
  "standard_signature",
  "secure_archiving",
]);

export function useSubscriptionGating() {
  const { subscription } = useAuth();

  const currentTier = planToTier(subscription.plan);

  const canAccess = (feature: string): boolean => {
    if (subscription.loading) return true; // Don't block while loading
    if (currentTier === "global") return true; // Global has everything
    if (currentTier === "local") return !GLOBAL_ONLY_FEATURES.has(feature);
    // Free tier - only basic access
    return false;
  };

  const requiresUpgrade = (feature: string): "global" | "local" | null => {
    if (subscription.loading) return null;
    if (currentTier === "global") return null;
    if (GLOBAL_ONLY_FEATURES.has(feature)) return "global";
    if (currentTier === "free" && LOCAL_FEATURES.has(feature)) return "local";
    return null;
  };

  const isGlobal = currentTier === "global";
  const isLocal = currentTier === "local";
  const isFree = currentTier === "free";

  return {
    currentTier,
    canAccess,
    requiresUpgrade,
    isGlobal,
    isLocal,
    isFree,
    isLoading: subscription.loading,
  };
}

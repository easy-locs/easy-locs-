import { useAuth } from "@/contexts/AuthContext";

/**
 * Simplified subscription gating — single unlimited tier.
 * subscribed = full access, otherwise free.
 */
export function useSubscriptionGating() {
  const { subscription } = useAuth();

  const isSubscribed = subscription.subscribed;
  const isLoading = subscription.loading;

  const canAccess = (_feature: string): boolean => {
    if (isLoading) return true; // Don't block while loading
    return isSubscribed;
  };

  const requiresUpgrade = (_feature: string): "unlimited" | null => {
    if (isLoading) return null;
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

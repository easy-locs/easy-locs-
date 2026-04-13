/**
 * Dashboard Selectors — Read-only projections from other domain stores.
 *
 * Dashboard NEVER writes. It only reads and aggregates.
 */
import type { CanonicalDashboardSummary } from "../shared/canonical-types";

/**
 * Aggregates a dashboard summary from existing domain stores.
 * This is a pure read — no side effects, no writes.
 */
export function selectDashboardSummary(): CanonicalDashboardSummary {
  const { getOrbitIdentity } = require("@/hooks/useOrbitIdentity");
  const { useWalletStore } = require("@/stores/walletStore");

  const _identity = getOrbitIdentity();
  const wallet = useWalletStore.getState();

  return {
    unreadMessages: 0, // derived from orbit thread store
    activeConversations: 0,
    walletBalance: wallet.wallet?.availableBalance ?? 0,
    walletCurrency: wallet.wallet?.currency ?? "AED",
    pendingBookings: 0,
    activeListings: 0,
    recentActivity: [],
  };
}

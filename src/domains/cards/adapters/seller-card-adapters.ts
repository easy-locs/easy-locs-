/**
 * Card Adapters — Seller Surface
 * Canonical adapters for seller-specific cards.
 */
import { useMemo } from "react";
import { buildCardContract, type CardContract } from "../card-contract";
import { useAuth } from "@/contexts/AuthContext";

// ── Seller Businesses Card ──
export function useSellerBusinessesCard(): CardContract<{ count: number }> {
  const { user } = useAuth();

  return useMemo(
    () =>
      buildCardContract({
        id: "seller_businesses",
        domain: "marketplace",
        title: "My Businesses",
        data: null, // populated by seller query pipeline
        disabled: !user?.id,
        disabledReason: !user?.id ? "Not authenticated" : undefined,
        deepLink: "/seller",
        primaryAction: {
          label: "Add Business",
          run: async () => {
            const { platformBus } = await import("@/lib/shared/platform-bus");
            platformBus.emit("seller:create_business", { userId: user!.id }, "sellerBusinessesCard");
          },
        },
      }),
    [user?.id],
  );
}

// ── Seller Listing Lifecycle Card ──
export function useSellerListingLifecycleCard(): CardContract<{ activeCount: number; expiringCount: number }> {
  const { user } = useAuth();

  return useMemo(
    () =>
      buildCardContract({
        id: "seller_listing_lifecycle",
        domain: "marketplace",
        title: "Listing Lifecycle",
        data: null, // populated by seller pipeline
        disabled: !user?.id,
        disabledReason: !user?.id ? "Not authenticated" : undefined,
        deepLink: "/seller",
      }),
    [user?.id],
  );
}

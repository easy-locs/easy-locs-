/**
 * Card Adapters — Seller Surface
 * REAL data from seller-services + seller-shops queries.
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { buildCardContract, type CardContract } from "../card-contract";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

// ── Seller Businesses Card — REAL data from storefront_pages ──
export function useSellerBusinessesCard(): CardContract<{ shops: any[]; count: number }> {
  const { user } = useAuth();

  const { data: shops, error, isLoading } = useQuery({
    queryKey: ["seller-shops-card", user?.id],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("storefront_pages")
        .select("id, name, slug, vertical, city, logo_url, active, status")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(20);
      return data ?? [];
    },
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  return useMemo(
    () =>
      buildCardContract({
        id: "seller_businesses",
        domain: "marketplace",
        title: "My Businesses",
        data: shops ? { shops, count: shops.length } : null,
        error: error?.message,
        disabled: !user?.id,
        disabledReason: !user?.id ? "Not authenticated" : undefined,
        deepLink: "/seller",
        primaryAction: {
          label: "Add Business",
          actionType: "mutation" as const,
          run: async () => {
            const { platformBus } = await import("@/lib/shared/platform-bus");
            platformBus.emit("seller:create_business", { userId: user!.id }, "sellerBusinessesCard");
          },
        },
      }),
    [shops, error, user?.id],
  );
}

// ── Seller Listing Lifecycle Card — REAL data from marketplace_services ──
export function useSellerListingLifecycleCard(): CardContract<{
  activeCount: number;
  expiringCount: number;
  totalCount: number;
}> {
  const { user, orgId } = useAuth();

  const { data: services, error } = useQuery({
    queryKey: ["seller-services-card", orgId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("marketplace_services")
        .select("id, status, active, listing_expires_at")
        .eq("org_id", orgId!)
        .limit(100);
      return data ?? [];
    },
    enabled: !!orgId,
    staleTime: 30_000,
  });

  return useMemo(() => {
    const list = services ?? [];
    const now = Date.now();
    const active = list.filter((s: any) => s.active).length;
    const expiring = list.filter((s: any) => {
      if (!s.listing_expires_at) return false;
      const diff = new Date(s.listing_expires_at).getTime() - now;
      return diff > 0 && diff < 5 * 86400000;
    }).length;

    return buildCardContract({
      id: "seller_listing_lifecycle",
      domain: "marketplace",
      title: "Listing Lifecycle",
      data: list.length > 0 ? { activeCount: active, expiringCount: expiring, totalCount: list.length } : null,
      error: error?.message,
      disabled: !orgId,
      disabledReason: !orgId ? "No organization" : undefined,
      deepLink: "/seller",
      primaryAction: {
        label: "Manage Listings",
        actionType: "navigation" as const,
        run: () => { window.location.href = "/seller"; },
      },
    });
  }, [services, error, orgId]);
}

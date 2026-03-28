/**
 * useMarketplaceData — Data-fetching for ActivitiesMarketplace via repository.
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { computeExchangeRate } from "@/hooks/useCurrencyConversion";
import {
  fetchMyProvider, fetchMyServices, fetchMyBookings,
  fetchPublicProviders,
} from "@/repositories/marketplace.repository";

export function useMarketplaceData(orgId: string | undefined, displayCurrency: string) {
  const { data: myProvider } = useQuery({
    queryKey: ["my_marketplace_provider", orgId],
    queryFn: () => fetchMyProvider(orgId!),
    enabled: !!orgId,
  });

  const { data: myServices = [] } = useQuery({
    queryKey: ["my_marketplace_services", myProvider?.id],
    queryFn: () => fetchMyServices(myProvider!.id),
    enabled: !!myProvider?.id,
  });

  const { data: myBookings = [] } = useQuery({
    queryKey: ["my_marketplace_bookings", orgId],
    queryFn: () => fetchMyBookings(orgId!),
    enabled: !!orgId,
  });

  useRealtimeSubscription({
    table: "marketplace_bookings",
    channelName: `marketplace-bookings-rt-${orgId}`,
    filter: orgId ? `org_id=eq.${orgId}` : undefined,
    queryKeys: [["my_marketplace_bookings", orgId]],
    enabled: !!orgId,
  });

  const { data: allProviders = [] } = useQuery({
    queryKey: ["browse_marketplace_providers"],
    queryFn: () => fetchPublicProviders(),
  });

  const providersMap = useMemo(() => {
    const m: Record<string, any> = {};
    allProviders.forEach((p: any) => { m[p.id] = p; });
    return m;
  }, [allProviders]);

  const revenueByCurrency = useMemo(() => {
    const map: Record<string, number> = {};
    myBookings.filter((b: any) => b.payment_confirmed).forEach((b: any) => {
      const cur = b.currency || "EUR";
      map[cur] = (map[cur] || 0) + Number(b.total_price || 0);
    });
    return map;
  }, [myBookings]);

  const totalRevenueConverted = useMemo(() => {
    let total = 0;
    for (const [cur, amount] of Object.entries(revenueByCurrency)) {
      total += amount * computeExchangeRate(cur, displayCurrency);
    }
    return Math.round(total * 100) / 100;
  }, [revenueByCurrency, displayCurrency]);

  const paidBookings = useMemo(() => myBookings.filter((b: any) => b.payment_confirmed), [myBookings]);
  const totalBookings = myBookings.length;
  const pendingBookings = myBookings.filter((b: any) => b.status === "pending").length;

  return {
    myProvider, myServices, myBookings, allProviders, providersMap,
    revenueByCurrency, totalRevenueConverted, paidBookings,
    totalBookings, pendingBookings,
  };
}

/**
 * useLiveDeliveryContext — Hook for live ETA & merchant ranking
 * in food/grocery/parcel discovery pages.
 */
import { useState, useEffect, useCallback } from "react";
import {
  rankMerchantsForCustomer,
  buildZoneKey,
  fetchGeoLiveContext,
  type MerchantVisibility,
  type GeoLiveContext,
} from "@/lib/mobility/live-context-engine";
import { useLocationStore } from "@/stores/locationStore";

interface UseLiveDeliveryContextParams {
  merchantIds: string[];
  merchantLocations: Record<string, { lat: number; lng: number; rating?: number }>;
  countryCode?: string;
  city?: string;
  district?: string;
  enabled?: boolean;
}

export function useLiveDeliveryContext(params: UseLiveDeliveryContextParams) {
  const { merchantIds, merchantLocations, countryCode, city, district, enabled = true } = params;
  const loc = useLocationStore((s) => s.currentLocation);

  const [rankings, setRankings] = useState<MerchantVisibility[]>([]);
  const [geoContext, setGeoContext] = useState<GeoLiveContext | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!enabled || !loc || merchantIds.length === 0) return;

    setLoading(true);
    try {
      const zoneKey = countryCode && city
        ? buildZoneKey(countryCode, city, district)
        : undefined;

      if (zoneKey) {
        const ctx = await fetchGeoLiveContext(zoneKey);
        setGeoContext(ctx);
      }

      const ranked = await rankMerchantsForCustomer({
        customerLat: loc.lat,
        customerLng: loc.lng,
        zoneKey: countryCode && city ? buildZoneKey(countryCode, city, district) : undefined,
        merchantIds,
        merchantLocations,
      });

      setRankings(ranked);
    } catch (e) {
      console.error("[LiveDeliveryContext] ranking failed:", e);
    } finally {
      setLoading(false);
    }
  }, [enabled, loc, merchantIds, merchantLocations, countryCode, city, district]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { rankings, geoContext, loading, refresh };
}

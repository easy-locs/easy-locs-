import { useEffect } from "react";
import { useLiveGeolocation } from "@/hooks/useLiveGeolocation";
import { pushDriverLocation } from "@/lib/services/driver-location";

export function useDriverLiveMode(params: {
  enabled: boolean;
  driverId?: string;
  serviceMode?: "delivery" | "taxi" | "courier" | "mixed";
}) {
  const { coords, error } = useLiveGeolocation(params.enabled && !!params.driverId);

  useEffect(() => {
    if (!coords || !params.driverId) return;

    pushDriverLocation({
      driverId: params.driverId,
      lat: coords.latitude,
      lng: coords.longitude,
      accuracyM: coords.accuracy ?? undefined,
      heading: coords.heading ?? undefined,
      speedKmh: coords.speed ? coords.speed * 3.6 : undefined,
      serviceMode: params.serviceMode,
    }).catch(console.error);
  }, [coords, params.driverId, params.serviceMode]);

  return { coords, error };
}

import { useEffect } from "react";
import { useGeoStore } from "@/lib/geo/geo-store";
import { pushDriverLocation } from "@/lib/services/driver-location";

export function useDriverLiveMode(params: {
  enabled: boolean;
  driverId?: string;
  serviceMode?: "delivery" | "taxi" | "courier" | "mixed";
}) {
  const point = useGeoStore((s) => s.point);
  const error = useGeoStore((s) => s.error);

  useEffect(() => {
    if (!params.enabled || !params.driverId || !point) return;

    pushDriverLocation({
      driverId: params.driverId,
      lat: point.lat,
      lng: point.lng,
      accuracyM: point.accuracy ?? undefined,
      heading: point.heading ?? undefined,
      speedKmh: point.speed ? point.speed * 3.6 : undefined,
      serviceMode: params.serviceMode,
    }).catch(console.error);
  }, [point, params.driverId, params.serviceMode, params.enabled]);

  const coords = point
    ? {
        latitude: point.lat,
        longitude: point.lng,
        accuracy: point.accuracy,
        heading: point.heading,
        speed: point.speed,
      }
    : null;

  return { coords, error };
}

import { useEffect } from "react";
import { pushMyTracking } from "@/lib/rides/service";

export function TrackingPusher({ rideId }: { rideId: string }) {
  useEffect(() => {
    if (!navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        void pushMyTracking({
          rideId,
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracyM: pos.coords.accuracy,
          speedKmh: pos.coords.speed ? pos.coords.speed * 3.6 : null,
          heading: pos.coords.heading,
        });
      },
      (err) => console.error("tracking error", err),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [rideId]);

  return null;
}

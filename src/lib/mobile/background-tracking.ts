import { pushDriverLocation } from "@/lib/services/driver-location";

let backgroundTimer: ReturnType<typeof setInterval> | null = null;

export function startBackgroundTracking(params: {
  driverId: string;
  serviceMode?: "delivery" | "taxi" | "courier" | "mixed";
  getCoords: () => Promise<{ lat: number; lng: number; accuracy?: number; heading?: number; speed?: number } | null>;
}) {
  stopBackgroundTracking();

  backgroundTimer = setInterval(async () => {
    try {
      const coords = await params.getCoords();
      if (!coords) return;

      await pushDriverLocation({
        driverId: params.driverId,
        lat: coords.lat,
        lng: coords.lng,
        accuracyM: coords.accuracy,
        heading: coords.heading,
        speedKmh: coords.speed ? coords.speed * 3.6 : undefined,
        serviceMode: params.serviceMode,
      });
    } catch (e) {
      console.error("[BackgroundTracking] push failed:", e);
    }
  }, 10_000);
}

export function stopBackgroundTracking() {
  if (backgroundTimer) {
    clearInterval(backgroundTimer);
    backgroundTimer = null;
  }
}

/**
 * location.stream — Canonical GPS stream with throttling and movement threshold.
 */
import { useGeoStore } from "@/lib/geo/geo-store";

const MIN_UPDATE_INTERVAL_MS = 3000;
const MIN_MOVEMENT_METERS = 5;

let lastEmitTime = 0;
let lastEmitLat = 0;
let lastEmitLng = 0;

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export const LocationStream = {
  /** Start watching position with throttling. Returns a cleanup function. */
  startWatch(onUpdate: (lat: number, lng: number, accuracy: number | null) => void): () => void {
    if (!("geolocation" in navigator)) return () => {};

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude: lat, longitude: lng, accuracy } = pos.coords;
        const now = Date.now();

        // Update geoStore always
        useGeoStore.getState().setStatePartial({
          point: { lat, lng, accuracy, heading: pos.coords.heading, speed: pos.coords.speed, timestamp: pos.timestamp },
          permission: "granted",
          tracking: true,
          ready: true,
          source: "gps",
        });

        // Throttle callback: time + distance
        const timeDelta = now - lastEmitTime;
        const distDelta = lastEmitTime ? haversineMeters(lastEmitLat, lastEmitLng, lat, lng) : Infinity;

        if (timeDelta >= MIN_UPDATE_INTERVAL_MS && distDelta >= MIN_MOVEMENT_METERS) {
          lastEmitTime = now;
          lastEmitLat = lat;
          lastEmitLng = lng;
          onUpdate(lat, lng, accuracy);
        }
      },
      (err) => {
        useGeoStore.getState().setStatePartial({
          error: err.message,
          permission: err.code === 1 ? "denied" : "prompt",
        });
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 3000 },
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
      useGeoStore.getState().setStatePartial({ tracking: false });
      lastEmitTime = 0;
    };
  },
};

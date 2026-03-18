/**
 * useGPSTracking — Live GPS position tracking for mobile entities.
 * Updates live_lat/live_lng in the database when presence_mode = 'live'.
 */
import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

const MIN_MOVE_METERS = 20; // Ignore moves under 20m (GPS noise filter)
const UPDATE_INTERVAL_MS = 10_000; // Update every 10 seconds
const STALE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

interface GPSTrackingOptions {
  listingId: string;
  enabled: boolean; // Only track when presence_mode = 'live'
  onPositionUpdate?: (lat: number, lng: number) => void;
}

/** Haversine distance in meters */
function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function useGPSTracking({ listingId, enabled, onPositionUpdate }: GPSTrackingOptions) {
  const lastPos = useRef<{ lat: number; lng: number } | null>(null);
  const watchId = useRef<number | null>(null);
  const intervalId = useRef<ReturnType<typeof setInterval> | null>(null);
  const pendingPos = useRef<{ lat: number; lng: number } | null>(null);

  const pushUpdate = useCallback(async (lat: number, lng: number) => {
    const now = new Date().toISOString();
    await (supabase as any)
      .from("marketplace_services")
      .update({
        live_lat: lat,
        live_lng: lng,
        live_updated_at: now,
        is_live_online: true,
      })
      .eq("id", listingId);
    lastPos.current = { lat, lng };
    onPositionUpdate?.(lat, lng);
  }, [listingId, onPositionUpdate]);

  const goOffline = useCallback(async () => {
    await (supabase as any)
      .from("marketplace_services")
      .update({ is_live_online: false })
      .eq("id", listingId);
  }, [listingId]);

  useEffect(() => {
    if (!enabled || !listingId || !("geolocation" in navigator)) return;

    // Watch position
    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        // Apply movement threshold
        if (lastPos.current) {
          const dist = distanceMeters(lastPos.current.lat, lastPos.current.lng, latitude, longitude);
          if (dist < MIN_MOVE_METERS) return;
        }
        pendingPos.current = { lat: latitude, lng: longitude };
      },
      (err) => console.warn("[GPS] Watch error:", err.message),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    );

    // Batch push updates at interval
    intervalId.current = setInterval(() => {
      if (pendingPos.current) {
        pushUpdate(pendingPos.current.lat, pendingPos.current.lng);
        pendingPos.current = null;
      }
    }, UPDATE_INTERVAL_MS);

    // Initial online signal
    pushUpdate(0, 0).catch(() => {}); // Will be overwritten by first real position

    return () => {
      if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
      if (intervalId.current !== null) clearInterval(intervalId.current);
      goOffline();
    };
  }, [enabled, listingId, pushUpdate, goOffline]);
}

/** Check if a live entity is stale (older than threshold) */
export function isLiveStale(liveUpdatedAt: string | null): boolean {
  if (!liveUpdatedAt) return true;
  return Date.now() - new Date(liveUpdatedAt).getTime() > STALE_THRESHOLD_MS;
}

export { STALE_THRESHOLD_MS, MIN_MOVE_METERS };

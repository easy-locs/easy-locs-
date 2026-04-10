/**
 * useDeliveryTracking — Bridge delivery jobs to live_trackings system.
 * Uses canonical locationStore instead of raw navigator.geolocation.
 */
import { useState, useEffect, useCallback } from "react";
import { db } from "@/services/db";
import { useTrackingObserver, type TrackingSession } from "@/hooks/useServiceTracking";
import { findActiveTracking } from "@/hooks/useLiveTracking";
import { useLocationStore } from "@/stores/locationStore";

export function useDeliveryTracking(jobId: string | null) {
  const [trackingId, setTrackingId] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!jobId) { setTrackingId(null); return; }
    let cancelled = false;
    setSearching(true);

    (async () => {
      const id = await findActiveTracking("delivery", jobId);
      if (!cancelled) {
        setTrackingId(id);
        setSearching(false);
      }
    })();

    return () => { cancelled = true; };
  }, [jobId]);

  const { session, loading: observerLoading } = useTrackingObserver(trackingId);

  return {
    trackingId,
    session,
    loading: searching || observerLoading,
    hasTracking: !!trackingId,
  };
}

/**
 * For DRIVERS: start tracking for a delivery job.
 * Uses canonical locationStore for current position.
 */
export function useDeliveryTrackerStart() {
  const [starting, setStarting] = useState(false);

  const startTracking = useCallback(async (opts: {
    jobId: string;
    orgId: string;
    destinationLat?: number;
    destinationLng?: number;
    destinationLabel?: string;
    viewerUserId?: string;
  }) => {
    setStarting(true);
    try {
      const existing = await findActiveTracking("delivery", opts.jobId);
      if (existing) return existing;

      // Use canonical locationStore instead of raw navigator.geolocation
      const loc = useLocationStore.getState().currentLocation;
      const lat = loc?.lat ?? 0;
      const lng = loc?.lng ?? 0;

      const { data, error } = await db("live_trackings")
        .insert({
          org_id: opts.orgId,
          context_type: "delivery",
          context_id: opts.jobId,
          context_label: opts.destinationLabel || "Livraison",
          destination_lat: opts.destinationLat || null,
          destination_lng: opts.destinationLng || null,
          destination_label: opts.destinationLabel || null,
          current_lat: lat,
          current_lng: lng,
          status: "en_route",
          started_at: new Date().toISOString(),
          viewer_user_id: opts.viewerUserId || null,
        } as any)
        .select("id")
        .single();

      if (error) throw error;
      return data?.id || null;
    } finally {
      setStarting(false);
    }
  }, []);

  return { startTracking, starting };
}

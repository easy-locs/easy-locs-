/**
 * useDeliveryTracking — Bridge delivery jobs to live_trackings system.
 * PASS79-J: Live GPS Tracking for Deliveries
 */
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTrackingObserver, type TrackingSession } from "@/hooks/useServiceTracking";
import { findActiveTracking } from "@/hooks/useLiveTracking";

/**
 * For SELLERS/BUYERS: observe a delivery driver's live position.
 * Finds or creates the tracking session linked to a delivery job.
 */
export function useDeliveryTracking(jobId: string | null) {
  const [trackingId, setTrackingId] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);

  // Find existing tracking session for this job
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

  // Use the existing observer hook
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
      // Check if tracking already exists
      const existing = await findActiveTracking("delivery", opts.jobId);
      if (existing) return existing;

      // Get current position
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000 })
      );

      const { data, error } = await supabase
        .from("live_trackings")
        .insert({
          org_id: opts.orgId,
          context_type: "delivery",
          context_id: opts.jobId,
          context_label: opts.destinationLabel || "Livraison",
          destination_lat: opts.destinationLat || null,
          destination_lng: opts.destinationLng || null,
          destination_label: opts.destinationLabel || null,
          current_lat: pos.coords.latitude,
          current_lng: pos.coords.longitude,
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

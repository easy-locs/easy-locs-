/**
 * useLiveTracking — Live GPS tracking hook.
 * MIGRATED: All DB ops via delivery.repository.
 */
import { useState, useEffect, useCallback, useRef } from "react";
import * as deliveryRepo from "@/repositories/delivery.repository";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { platformBus } from "@/lib/shared/platform-bus";

export type TrackingStatus = "pending" | "en_route" | "nearby" | "arrived" | "completed" | "cancelled";
export type TrackingContextType = "delivery" | "visit" | "intervention" | "appointment" | "agent";

export interface TrackingData {
  id: string;
  status: TrackingStatus;
  current_lat: number | null;
  current_lng: number | null;
  destination_lat: number | null;
  destination_lng: number | null;
  origin_lat: number | null;
  origin_lng: number | null;
  eta_minutes: number | null;
  speed_kmh: number;
  heading: number;
  context_type: string;
  context_id: string | null;
  context_label: string | null;
  tracker_user_id: string;
  viewer_user_id: string | null;
  last_position_at: string;
  started_at: string | null;
  completed_at: string | null;
  metadata_json: Record<string, unknown>;
}

interface UseTrackerOpts {
  trackingId?: string;
  contextType: TrackingContextType;
  contextId: string;
  contextLabel?: string;
  viewerUserId?: string;
  destinationLat?: number;
  destinationLng?: number;
}

export function useTracker(opts: UseTrackerOpts) {
  const { user, orgId } = useAuth();
  const [trackingId, setTrackingId] = useState<string | null>(opts.trackingId || null);
  const [status, setStatus] = useState<TrackingStatus>("pending");

  const startTracking = useCallback(async () => {
    if (!user?.id || !orgId) return null;
    if (!opts.contextType || !opts.contextId) {
      console.error("[tracker] Cannot start: contextType and contextId are required");
      return null;
    }

    const { requestLocation } = await import("@/lib/location/requestLocation");
    const origin = await requestLocation();

    const id = await deliveryRepo.insertLiveTracking({
      org_id: orgId,
      tracker_user_id: user.id,
      viewer_user_id: opts.viewerUserId || null,
      context_type: opts.contextType,
      context_id: opts.contextId,
      context_label: opts.contextLabel || null,
      destination_lat: opts.destinationLat || null,
      destination_lng: opts.destinationLng || null,
      origin_lat: origin?.lat || null,
      origin_lng: origin?.lng || null,
      current_lat: origin?.lat || null,
      current_lng: origin?.lng || null,
      status: "en_route",
      started_at: new Date().toISOString(),
      metadata_json: { context_type: opts.contextType, context_id: opts.contextId, started_by: user.id },
    });

    setTrackingId(id);
    setStatus("en_route");

    platformBus.emit("tracking:started", {
      trackingId: id, contextType: opts.contextType, contextId: opts.contextId,
    }, "tracking", { userId: user.id, orgId });

    const { watchCurrentPosition } = await import("@/lib/location/geolocation");
    watchCurrentPosition(
      (pos) => { updatePosition(id, pos.lat, pos.lng, null, null); },
      () => {},
    );

    return id;
  }, [user?.id, orgId, opts.contextType, opts.contextId, opts.contextLabel, opts.viewerUserId, opts.destinationLat, opts.destinationLng]);

  const updatePosition = useCallback(async (id: string, lat: number, lng: number, speed?: number | null, heading?: number | null) => {
    const eta = calculateETA(lat, lng, opts.destinationLat, opts.destinationLng, speed);
    const newStatus = getProximityStatus(lat, lng, opts.destinationLat, opts.destinationLng);

    await deliveryRepo.updateLiveTracking(id, {
      current_lat: lat, current_lng: lng,
      speed_kmh: speed ? speed * 3.6 : 0,
      heading: heading || 0,
      eta_minutes: eta, status: newStatus,
      last_position_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    platformBus.emit("tracking:position_updated", {
      trackingId: id, lat, lng, status: newStatus, contextType: opts.contextType, contextId: opts.contextId,
    }, "tracking", { userId: user?.id, orgId });

    if (newStatus !== status) {
      setStatus(newStatus);
      platformBus.emit("tracking:status_changed", {
        trackingId: id, status: newStatus, contextType: opts.contextType, contextId: opts.contextId,
      }, "tracking", { userId: user?.id, orgId });
    }
  }, [status, opts.destinationLat, opts.destinationLng, opts.contextType, opts.contextId, user?.id, orgId]);

  const updateStatus = useCallback(async (newStatus: TrackingStatus) => {
    if (!trackingId) return;
    const updates: Record<string, unknown> = { status: newStatus, updated_at: new Date().toISOString() };
    if (newStatus === "completed") updates.completed_at = new Date().toISOString();

    await deliveryRepo.updateLiveTracking(trackingId, updates);
    setStatus(newStatus);

    if (newStatus === "completed") {
      stopWatch();
      platformBus.emit("tracking:completed", { trackingId, contextType: opts.contextType, contextId: opts.contextId }, "tracking", { userId: user?.id, orgId });
    } else {
      platformBus.emit("tracking:status_changed", { trackingId, status: newStatus, contextType: opts.contextType, contextId: opts.contextId }, "tracking", { userId: user?.id, orgId });
    }
  }, [trackingId, user?.id, orgId, opts.contextType, opts.contextId]);

  const stopWatch = useCallback(() => {
    import("@/lib/location/geolocation").then(({ stopWatchingPosition }) => { stopWatchingPosition(); });
  }, []);

  useEffect(() => { return () => stopWatch(); }, [stopWatch]);

  return { trackingId, status, startTracking, updateStatus, stopWatch };
}

export function useTrackingViewer(trackingId: string | null) {
  const [tracking, setTracking] = useState<TrackingData | null>(null);
  const [positions, setPositions] = useState<Array<{ lat: number; lng: number; time: number }>>([]);

  useEffect(() => {
    if (!trackingId) return;
    (async () => {
      const data = await deliveryRepo.fetchLiveTracking(trackingId);
      if (data) {
        const td = data as unknown as TrackingData;
        setTracking(td);
        if (td.current_lat && td.current_lng) {
          setPositions([{ lat: td.current_lat, lng: td.current_lng, time: Date.now() }]);
        }
      }
    })();
  }, [trackingId]);

  useEffect(() => {
    if (!trackingId) return;
    return deliveryRepo.subscribeLiveTracking(trackingId, (updated) => {
      const td = updated as unknown as TrackingData;
      setTracking(td);
      if (td.current_lat && td.current_lng) {
        setPositions((prev) => [...prev, { lat: td.current_lat!, lng: td.current_lng!, time: Date.now() }].slice(-500));
      }
    });
  }, [trackingId]);

  const isComplete = tracking?.status === "completed" || tracking?.status === "cancelled";
  return { tracking, positions, isComplete };
}

export async function findActiveTracking(contextType: TrackingContextType, contextId: string): Promise<string | null> {
  return deliveryRepo.findActiveTracking(contextType, contextId);
}

function calculateETA(lat: number, lng: number, destLat?: number, destLng?: number, speedMs?: number | null): number | null {
  if (!destLat || !destLng) return null;
  const dist = haversineKm(lat, lng, destLat, destLng);
  const speedKmh = speedMs ? speedMs * 3.6 : 30;
  if (speedKmh < 1) return Math.round(dist / 0.5 * 60);
  return Math.max(1, Math.round((dist / speedKmh) * 60));
}

function getProximityStatus(lat: number, lng: number, destLat?: number, destLng?: number): TrackingStatus {
  if (!destLat || !destLng) return "en_route";
  const dist = haversineKm(lat, lng, destLat, destLng);
  if (dist < 0.05) return "arrived";
  if (dist < 0.5) return "nearby";
  return "en_route";
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

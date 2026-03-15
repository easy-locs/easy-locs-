/**
 * useLiveTracking — Deliveroo/Uber-style live GPS tracking hook.
 * 
 * For TRACKER (agent/driver): creates tracking, updates position in real-time.
 * For VIEWER (client): subscribes to position updates via Supabase Realtime.
 * 
 * BUSINESS CONTEXT ENFORCEMENT:
 * Every tracking session MUST be linked to a business entity:
 * - delivery     → concierge_order / marketplace_booking
 * - visit        → booking_request / real_estate_listing
 * - intervention → booking_task / maintenance request
 * - appointment  → deal_room / conversation thread
 * - agent        → org_member assignment
 */
import { useState, useEffect, useCallback, useRef } from "react";
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
  /** Resume an existing tracking session */
  trackingId?: string;
  /** REQUIRED — business context type */
  contextType: TrackingContextType;
  /** REQUIRED — ID of the linked business entity (booking, order, task, deal, etc.) */
  contextId: string;
  /** Human-readable label shown on the map */
  contextLabel?: string;
  /** User who will see the tracking (client / tenant) */
  viewerUserId?: string;
  /** Destination coordinates */
  destinationLat?: number;
  destinationLng?: number;
}

/** Hook for the TRACKER (person being tracked) */
export function useTracker(opts: UseTrackerOpts) {
  const { user, orgId } = useAuth();
  const [trackingId, setTrackingId] = useState<string | null>(opts.trackingId || null);
  const [status, setStatus] = useState<TrackingStatus>("pending");
  const watchIdRef = useRef<number | null>(null);

  const startTracking = useCallback(async () => {
    if (!user?.id || !orgId) return null;

    // Enforce mandatory business context
    if (!opts.contextType || !opts.contextId) {
      console.error("[tracker] Cannot start: contextType and contextId are required");
      return null;
    }

    // Capture origin position
    const origin = await new Promise<{ lat: number; lng: number } | null>((resolve) => {
      if (!("geolocation" in navigator)) { resolve(null); return; }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });

    const insertPayload: Record<string, unknown> = {
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
      metadata_json: {
        context_type: opts.contextType,
        context_id: opts.contextId,
        started_by: user.id,
      },
    };

    const { data, error } = await supabase
      .from("live_trackings")
      .insert(insertPayload as any)
      .select()
      .single();

    if (error) { console.error("[tracker] start failed:", error); return null; }

    const id = (data as any).id;
    setTrackingId(id);
    setStatus("en_route");

    platformBus.emit("tracking:started", {
      trackingId: id,
      contextType: opts.contextType,
      contextId: opts.contextId,
    }, "tracking", { userId: user.id, orgId });

    // Start GPS watch
    if ("geolocation" in navigator) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          updatePosition(id, pos.coords.latitude, pos.coords.longitude, pos.coords.speed, pos.coords.heading);
        },
        () => {},
        { enableHighAccuracy: true, maximumAge: 3000, timeout: 15000 }
      );
    }

    return id;
  }, [user?.id, orgId, opts.contextType, opts.contextId, opts.contextLabel, opts.viewerUserId, opts.destinationLat, opts.destinationLng]);

  const updatePosition = useCallback(async (id: string, lat: number, lng: number, speed?: number | null, heading?: number | null) => {
    const eta = calculateETA(lat, lng, opts.destinationLat, opts.destinationLng, speed);
    const newStatus = getProximityStatus(lat, lng, opts.destinationLat, opts.destinationLng);

    const positionUpdate: Record<string, unknown> = {
      current_lat: lat,
      current_lng: lng,
      speed_kmh: speed ? speed * 3.6 : 0,
      heading: heading || 0,
      eta_minutes: eta,
      status: newStatus,
      last_position_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await supabase
      .from("live_trackings")
      .update(positionUpdate as any)
      .eq("id", id);

    if (newStatus !== status) {
      setStatus(newStatus);
      platformBus.emit("tracking:status_changed", {
        trackingId: id,
        status: newStatus,
        contextType: opts.contextType,
        contextId: opts.contextId,
      }, "tracking", { userId: user?.id, orgId });
    }
  }, [status, opts.destinationLat, opts.destinationLng, opts.contextType, opts.contextId, user?.id, orgId]);

  const updateStatus = useCallback(async (newStatus: TrackingStatus) => {
    if (!trackingId) return;
    const updates: Record<string, unknown> = { status: newStatus, updated_at: new Date().toISOString() };
    if (newStatus === "completed") updates.completed_at = new Date().toISOString();

    await supabase.from("live_trackings").update(updates as Record<string, unknown> as any).eq("id", trackingId);
    setStatus(newStatus);

    if (newStatus === "completed") {
      stopWatch();
      platformBus.emit("tracking:completed", {
        trackingId,
        contextType: opts.contextType,
        contextId: opts.contextId,
      }, "tracking", { userId: user?.id, orgId });
    } else {
      platformBus.emit("tracking:status_changed", {
        trackingId,
        status: newStatus,
        contextType: opts.contextType,
        contextId: opts.contextId,
      }, "tracking", { userId: user?.id, orgId });
    }
  }, [trackingId, user?.id, orgId, opts.contextType, opts.contextId]);

  const stopWatch = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => stopWatch();
  }, [stopWatch]);

  return { trackingId, status, startTracking, updateStatus, stopWatch };
}

/** Hook for the VIEWER (person watching the tracker) */
export function useTrackingViewer(trackingId: string | null) {
  const [tracking, setTracking] = useState<TrackingData | null>(null);
  const [positions, setPositions] = useState<Array<{ lat: number; lng: number; time: number }>>([]);

  // Initial load
  useEffect(() => {
    if (!trackingId) return;

    (async () => {
      const { data } = await supabase
        .from("live_trackings")
        .select("*")
        .eq("id", trackingId)
        .single();
      if (data) {
        const td = data as unknown as TrackingData;
        setTracking(td);
        // Seed positions with initial position
        if (td.current_lat && td.current_lng) {
          setPositions([{ lat: td.current_lat, lng: td.current_lng, time: Date.now() }]);
        }
      }
    })();
  }, [trackingId]);

  // Realtime subscription
  useEffect(() => {
    if (!trackingId) return;

    const channel = supabase
      .channel(`tracking-${trackingId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "live_trackings",
          filter: `id=eq.${trackingId}`,
        },
        (payload) => {
          const updated = payload.new as unknown as TrackingData;
          setTracking(updated);

          if (updated.current_lat && updated.current_lng) {
            setPositions((prev) => [
              ...prev,
              { lat: updated.current_lat!, lng: updated.current_lng!, time: Date.now() },
            ].slice(-500));
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [trackingId]);

  const isComplete = tracking?.status === "completed" || tracking?.status === "cancelled";

  return { tracking, positions, isComplete };
}

/** Find active tracking for a business context */
export async function findActiveTracking(contextType: TrackingContextType, contextId: string): Promise<string | null> {
  const { data } = await supabase
    .from("live_trackings")
    .select("id")
    .eq("context_type", contextType)
    .eq("context_id", contextId)
    .in("status", ["pending", "en_route", "nearby", "arrived"] as any)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as any)?.id || null;
}

// ── Helpers ──

function calculateETA(
  lat: number, lng: number,
  destLat?: number, destLng?: number,
  speedMs?: number | null
): number | null {
  if (!destLat || !destLng) return null;
  const dist = haversineKm(lat, lng, destLat, destLng);
  const speedKmh = speedMs ? speedMs * 3.6 : 30;
  if (speedKmh < 1) return Math.round(dist / 0.5 * 60);
  return Math.max(1, Math.round((dist / speedKmh) * 60));
}

function getProximityStatus(
  lat: number, lng: number,
  destLat?: number, destLng?: number
): TrackingStatus {
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
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

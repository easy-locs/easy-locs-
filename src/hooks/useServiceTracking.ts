/**
 * useServiceTracking — Realtime GPS tracking for deliveries, visits, interventions.
 * PASS55 Block G: Radar / Service Tracking
 *
 * Provides:
 * - Live session state with position, ETA, status
 * - Position streaming (tracker side)
 * - Realtime subscription for observers
 * - Status lifecycle: pending → en_route → nearby → arrived → completed
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { createRealtimeChannel, removeRealtimeChannel } from "@/lib/realtime";
import { useAuth } from "@/contexts/AuthContext";
import { haversineKm } from "@/lib/geo/distance";
import { platformBus } from "@/lib/shared/platform-bus";

export type TrackingStatus = "pending" | "en_route" | "nearby" | "arrived" | "completed" | "cancelled";

export interface TrackingSession {
  id: string;
  org_id: string;
  tracker_user_id: string;
  context_type: string;
  context_id: string | null;
  context_label: string | null;
  status: TrackingStatus;
  current_lat: number | null;
  current_lng: number | null;
  destination_lat: number | null;
  destination_lng: number | null;
  destination_label: string | null;
  eta_minutes: number | null;
  started_at: string | null;
  arrived_at: string | null;
  completed_at: string | null;
  metadata_json: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// ─── Observe a tracking session (viewer / manager side) ────

export function useTrackingObserver(sessionId: string | null) {
  const [session, setSession] = useState<TrackingSession | null>(null);
  const [loading, setLoading] = useState(true);

  // Initial fetch
  useEffect(() => {
    if (!sessionId) { setSession(null); setLoading(false); return; }
    setLoading(true);
    supabase
      .from("tracking_sessions")
      .select("*")
      .eq("id", sessionId)
      .single()
      .then(({ data }) => {
        setSession(data as TrackingSession | null);
        setLoading(false);
      });
  }, [sessionId]);

  // Realtime subscription
  useEffect(() => {
    if (!sessionId) return;
    const channel = supabase
      .channel(`tracking:${sessionId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "tracking_sessions", filter: `id=eq.${sessionId}` },
        (payload) => {
          setSession(payload.new as TrackingSession);
        }
      )
      .subscribe();
    return () => { removeRealtimeChannel(channel); };
  }, [sessionId]);

  // Computed
  const distanceKm =
    session?.current_lat && session?.current_lng && session?.destination_lat && session?.destination_lng
      ? haversineKm(session.current_lat, session.current_lng, session.destination_lat, session.destination_lng)
      : null;

  return { session, loading, distanceKm };
}

// ─── Tracker side: stream position + manage session ────────

export function useTrackingStreamer(sessionId: string | null) {
  const { user } = useAuth();
  const watchRef = useRef<number | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastPushRef = useRef(0);

  const NEARBY_THRESHOLD_KM = 0.3; // 300m
  const PUSH_INTERVAL_MS = 3000; // push every 3s max

  const startStreaming = useCallback(async () => {
    if (!sessionId || !user?.id) {
      setError("Session or user not available");
      return;
    }

    // Use canonical geo pipeline
    const { watchCurrentPosition } = await import("@/lib/location/geolocation");
    const { requestLocation } = await import("@/lib/location/requestLocation");

    // Force a fresh GPS fix first
    const initialPos = await requestLocation();
    if (!initialPos) {
      setError("Location unavailable — please enable GPS");
      return;
    }

    // Mark session as en_route
    await supabase
      .from("tracking_sessions")
      .update({ status: "en_route", started_at: new Date().toISOString() } as any)
      .eq("id", sessionId);

    setStreaming(true);

    watchCurrentPosition(
      async (geoResult) => {
        const now = Date.now();
        if (now - lastPushRef.current < PUSH_INTERVAL_MS) return;
        lastPushRef.current = now;

        const { lat, lng, accuracy } = geoResult;
        const speed: number | null = null;
        const heading: number | null = null;

        // Get destination for ETA
        const { data: sess } = await supabase
          .from("tracking_sessions")
          .select("destination_lat, destination_lng, status")
          .eq("id", sessionId)
          .single();

        let eta: number | null = null;
        let autoStatus: string | null = null;

        if (sess?.destination_lat && sess?.destination_lng) {
          const dist = haversineKm(lat, lng, sess.destination_lat, sess.destination_lng);
          // Rough ETA: assume avg 30km/h city speed if no speed data
          const avgSpeed = speed && speed > 0 ? speed * 3.6 : 30;
          eta = Math.max(1, Math.round((dist / avgSpeed) * 60));

          if (dist <= NEARBY_THRESHOLD_KM && sess.status === "en_route") {
            autoStatus = "nearby";
          }
        }

        // Update session position
        const updatePayload: Record<string, any> = {
          current_lat: lat,
          current_lng: lng,
          eta_minutes: eta,
          updated_at: new Date().toISOString(),
        };
        if (autoStatus) updatePayload.status = autoStatus;

        await supabase
          .from("tracking_sessions")
          .update(updatePayload as any)
          .eq("id", sessionId);

        // Record position history (non-blocking)
        supabase
          .from("tracking_positions")
          .insert({
            session_id: sessionId,
            lat,
            lng,
            speed_kmh: speed ? speed * 3.6 : null,
            heading,
            accuracy_m: accuracy,
          } as any)
          .then(() => {});

        platformBus.emit("tracking:position_updated", { sessionId, lat, lng, eta }, "tracking");
      },
      (err) => setError(err.message),
    );
  }, [sessionId, user?.id]);

  const stopStreaming = useCallback(async () => {
    const { stopWatchingPosition } = await import("@/lib/location/geolocation");
    stopWatchingPosition();
    setStreaming(false);
  }, []);

  const markArrived = useCallback(async () => {
    if (!sessionId) return;
    await supabase
      .from("tracking_sessions")
      .update({ status: "arrived", arrived_at: new Date().toISOString() } as any)
      .eq("id", sessionId);
    stopStreaming();
  }, [sessionId, stopStreaming]);

  const markCompleted = useCallback(async () => {
    if (!sessionId) return;
    await supabase
      .from("tracking_sessions")
      .update({ status: "completed", completed_at: new Date().toISOString() } as any)
      .eq("id", sessionId);
    stopStreaming();
  }, [sessionId, stopStreaming]);

  // Cleanup on unmount
  useEffect(() => {
    return () => { stopStreaming(); };
  }, [stopStreaming]);

  return { streaming, error, startStreaming, stopStreaming, markArrived, markCompleted };
}

// ─── List active tracking sessions for an org ──────────────

export function useOrgTrackingSessions() {
  const { orgId } = useAuth();
  const [sessions, setSessions] = useState<TrackingSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId) return;
    setLoading(true);
    supabase
      .from("tracking_sessions")
      .select("*")
      .eq("org_id", orgId)
      .in("status", ["pending", "en_route", "nearby", "arrived"])
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data }) => {
        setSessions((data || []) as TrackingSession[]);
        setLoading(false);
      });
  }, [orgId]);

  // Realtime for all active sessions
  useEffect(() => {
    if (!orgId) return;
    const channel = supabase
      .channel(`tracking_org:${orgId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tracking_sessions", filter: `org_id=eq.${orgId}` },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setSessions((prev) => [payload.new as TrackingSession, ...prev]);
          } else if (payload.eventType === "UPDATE") {
            setSessions((prev) =>
              prev.map((s) => (s.id === (payload.new as any).id ? (payload.new as TrackingSession) : s))
            );
          } else if (payload.eventType === "DELETE") {
            setSessions((prev) => prev.filter((s) => s.id !== (payload.old as any).id));
          }
        }
      )
      .subscribe();
    return () => { removeRealtimeChannel(channel); };
  }, [orgId]);

  return { sessions, loading };
}

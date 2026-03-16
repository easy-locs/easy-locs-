/**
 * useDriverSession — Manages driver online/offline status, GPS heartbeat, and session state.
 * PASS70-B: Driver Dashboard
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface DriverSession {
  id: string;
  user_id: string;
  org_id: string | null;
  status: "offline" | "online" | "on_delivery";
  vehicle_type: string;
  lat: number | null;
  lng: number | null;
  current_job_id: string | null;
  online_since: string | null;
  last_heartbeat_at: string | null;
  total_completed: number | null;
  total_cancelled: number | null;
  avg_rating: number | null;
  acceptance_rate: number | null;
  max_distance_km: number | null;
}

export function useDriverSession() {
  const { user } = useAuth();
  const [session, setSession] = useState<DriverSession | null>(null);
  const [loading, setLoading] = useState(true);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const watchIdRef = useRef<number | null>(null);

  // Fetch or create driver session
  const fetchSession = useCallback(async () => {
    if (!user?.id) return;
    const { data, error } = await supabase
      .from("driver_sessions")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) { console.error("[useDriverSession] fetch error:", error); return; }
    setSession(data as DriverSession | null);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { fetchSession(); }, [fetchSession]);

  // Go online
  const goOnline = useCallback(async (vehicleType = "car", orgId?: string) => {
    if (!user?.id) return;
    const now = new Date().toISOString();
    const payload = {
      user_id: user.id,
      status: "online" as const,
      vehicle_type: vehicleType,
      org_id: orgId || null,
      online_since: now,
      last_heartbeat_at: now,
      updated_at: now,
    };

    const { data, error } = await supabase
      .from("driver_sessions")
      .upsert(payload, { onConflict: "user_id" })
      .select()
      .single();

    if (error) { console.error("[useDriverSession] goOnline error:", error); return; }
    setSession(data as DriverSession);
    startGPSTracking();
  }, [user?.id]);

  // Go offline
  const goOffline = useCallback(async () => {
    if (!user?.id) return;
    stopGPSTracking();
    const { error } = await supabase
      .from("driver_sessions")
      .update({ status: "offline", current_job_id: null, updated_at: new Date().toISOString() })
      .eq("user_id", user.id);

    if (error) { console.error("[useDriverSession] goOffline error:", error); return; }
    setSession(prev => prev ? { ...prev, status: "offline", current_job_id: null } : null);
  }, [user?.id]);

  // GPS heartbeat
  const updatePosition = useCallback(async (lat: number, lng: number) => {
    if (!user?.id) return;
    await supabase
      .from("driver_sessions")
      .update({ lat, lng, last_heartbeat_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("user_id", user.id);
    setSession(prev => prev ? { ...prev, lat, lng } : null);
  }, [user?.id]);

  const startGPSTracking = useCallback(() => {
    if (!navigator.geolocation) return;
    // Watch position
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => updatePosition(pos.coords.latitude, pos.coords.longitude),
      () => {},
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
    );
    // Heartbeat every 30s
    heartbeatRef.current = setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        (pos) => updatePosition(pos.coords.latitude, pos.coords.longitude),
        () => {},
        { enableHighAccuracy: false, maximumAge: 30000 }
      );
    }, 30000);
  }, [updatePosition]);

  const stopGPSTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => () => stopGPSTracking(), [stopGPSTracking]);

  // Update preferences
  const updatePreferences = useCallback(async (maxDistanceKm: number, vehicleType: string) => {
    if (!user?.id) return;
    await supabase
      .from("driver_sessions")
      .update({ max_distance_km: maxDistanceKm, vehicle_type: vehicleType, updated_at: new Date().toISOString() })
      .eq("user_id", user.id);
    setSession(prev => prev ? { ...prev, max_distance_km: maxDistanceKm, vehicle_type: vehicleType } : null);
  }, [user?.id]);

  return {
    session,
    loading,
    isOnline: session?.status === "online" || session?.status === "on_delivery",
    isOnDelivery: session?.status === "on_delivery",
    goOnline,
    goOffline,
    updatePosition,
    updatePreferences,
    refetch: fetchSession,
  };
}

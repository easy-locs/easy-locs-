/**
 * useRadarLiveContext — Realtime subscriptions for radar layers.
 * Subscribes to geo_live_context, rider_runtime_state, zone_events.
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { createRealtimeChannel, removeRealtimeChannel } from "@/lib/realtime";
import type { GeoLiveContext, RiderRuntimeState } from "@/lib/mobility/live-context-engine";
import type { ZoneEvent } from "@/lib/radar/predictive-demand-engine";

export type RadarMode = "client" | "rider" | "merchant" | "admin";

interface RadarLiveState {
  geoContexts: GeoLiveContext[];
  riders: RiderRuntimeState[];
  zoneEvents: ZoneEvent[];
  loading: boolean;
}

export function useRadarLiveContext(mode: RadarMode = "client") {
  const [state, setState] = useState<RadarLiveState>({
    geoContexts: [],
    riders: [],
    zoneEvents: [],
    loading: true,
  });
  const channelsRef = useRef<any[]>([]);

  // Initial fetch
  const fetchAll = useCallback(async () => {
    const [geoRes, eventsRes] = await Promise.all([
      (supabase as any).from("geo_live_context").select("*"),
      (supabase as any).from("zone_events").select("*").eq("is_active", true),
    ]);

    // Only fetch riders for rider/admin modes
    let riders: RiderRuntimeState[] = [];
    if (mode === "rider" || mode === "admin") {
      const { data } = await (supabase as any).from("rider_runtime_state").select("*").eq("is_online", true);
      riders = data ?? [];
    }

    setState({
      geoContexts: geoRes.data ?? [],
      riders,
      zoneEvents: eventsRes.data ?? [],
      loading: false,
    });
  }, [mode]);

  useEffect(() => {
    fetchAll();

    // Realtime subscriptions
    const geoChannel = supabase
      .channel("radar-geo-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "geo_live_context" }, () => {
        fetchAll();
      })
      .subscribe();

    const eventsChannel = supabase
      .channel("radar-zone-events")
      .on("postgres_changes", { event: "*", schema: "public", table: "zone_events" }, () => {
        fetchAll();
      })
      .subscribe();

    channelsRef.current = [geoChannel, eventsChannel];

    if (mode === "rider" || mode === "admin") {
      const riderChannel = supabase
        .channel("radar-riders")
        .on("postgres_changes", { event: "*", schema: "public", table: "rider_runtime_state" }, () => {
          fetchAll();
        })
        .subscribe();
      channelsRef.current.push(riderChannel);
    }

    return () => {
      channelsRef.current.forEach(ch => removeRealtimeChannel(ch));
      channelsRef.current = [];
    };
  }, [mode, fetchAll]);

  return state;
}

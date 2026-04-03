/**
 * useRadarLiveContext — Realtime subscriptions for radar layers.
 * DB calls delegated to radar-repository.
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { removeRealtimeChannel } from "@/lib/realtime";
import { fetchRadarLiveData } from "@/repositories/radar-repository";
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
    geoContexts: [], riders: [], zoneEvents: [], loading: true,
  });
  const channelsRef = useRef<any[]>([]);

  const fetchAll = useCallback(async () => {
    const data = await fetchRadarLiveData(mode);
    setState({ ...data, loading: false });
  }, [mode]);

  useEffect(() => {
    fetchAll();

    const geoChannel = supabase
      .channel("radar-geo-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "geo_live_context" }, () => fetchAll())
      .subscribe();

    const eventsChannel = supabase
      .channel("radar-zone-events")
      .on("postgres_changes", { event: "*", schema: "public", table: "zone_events" }, () => fetchAll())
      .subscribe();

    channelsRef.current = [geoChannel, eventsChannel];

    if (mode === "rider" || mode === "admin") {
      const riderChannel = supabase
        .channel("radar-riders")
        .on("postgres_changes", { event: "*", schema: "public", table: "rider_runtime_state" }, () => fetchAll())
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

/**
 * useRealtimeDispatchBoard — Live data feed for admin dispatch board.
 */
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useRealtimeDispatchBoard() {
  const [state, setState] = useState({
    rides: [] as any[],
    alerts: [] as any[],
    zones: [] as any[],
    loading: true,
  });

  const load = useCallback(async () => {
    const [rides, alerts, zones] = await Promise.all([
      supabase.from("ride_requests" as any).select("*").order("updated_at", { ascending: false }).limit(100),
      supabase.from("admin_alerts" as any).select("*").eq("status", "open").order("created_at", { ascending: false }).limit(50),
      supabase.from("demand_zones" as any).select("*").order("surge_multiplier", { ascending: false }).limit(50),
    ]);

    setState({
      rides: (rides.data ?? []) as any[],
      alerts: (alerts.data ?? []) as any[],
      zones: (zones.data ?? []) as any[],
      loading: false,
    });
  }, []);

  useEffect(() => {
    load();

    const channel = supabase
      .channel("dispatch-board-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "ride_requests" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "admin_alerts" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "demand_zones" }, load)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [load]);

  return state;
}

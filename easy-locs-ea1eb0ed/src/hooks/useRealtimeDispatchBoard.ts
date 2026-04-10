/**
 * useRealtimeDispatchBoard — Canonical: reads from mobility_jobs.
 */
import { useEffect, useState, useCallback } from "react";
import { db } from "@/services/db";
import { createRealtimeChannel, removeRealtimeChannel } from "@/lib/realtime";

export function useRealtimeDispatchBoard() {
  const [state, setState] = useState({ rides: [] as any[], alerts: [] as any[], zones: [] as any[], loading: true });

  const load = useCallback(async () => {
    const [rides, alerts, zones] = await Promise.all([
      db("mobility_jobs").select("*").order("updated_at", { ascending: false }).limit(100),
      db("admin_alerts").select("*").eq("status", "open").order("created_at", { ascending: false }).limit(50),
      db("geo_live_zone_overlays").select("*").order("surge_multiplier", { ascending: false }).limit(50),
    ]);
    setState({ rides: (rides.data ?? []), alerts: (alerts.data ?? []), zones: (zones.data ?? []), loading: false });
  }, []);

  useEffect(() => {
    load();
    const channel = createRealtimeChannel("dispatch-board-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "mobility_jobs" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "admin_alerts" }, load)
      .subscribe();
    return () => { removeRealtimeChannel(channel); };
  }, [load]);

  return state;
}

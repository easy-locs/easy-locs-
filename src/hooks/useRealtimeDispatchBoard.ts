/**
 * useRealtimeDispatchBoard — Canonical: reads from mobility_jobs.
 */
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useRealtimeDispatchBoard() {
  const [state, setState] = useState({ rides: [] as any[], alerts: [] as any[], zones: [] as any[], loading: true });

  const load = useCallback(async () => {
    const [rides, alerts, zones] = await Promise.all([
      (supabase as any).from("mobility_jobs").select("*").order("updated_at", { ascending: false }).limit(100),
      (supabase as any).from("admin_alerts").select("*").eq("status", "open").order("created_at", { ascending: false }).limit(50),
      (supabase as any).from("demand_zones").select("*").order("surge_multiplier", { ascending: false }).limit(50),
    ]);
    setState({ rides: (rides.data ?? []), alerts: (alerts.data ?? []), zones: (zones.data ?? []), loading: false });
  }, []);

  useEffect(() => {
    load();
    const channel = supabase.channel("dispatch-board-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "mobility_jobs" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "admin_alerts" }, load)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [load]);

  return state;
}

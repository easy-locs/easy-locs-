/**
 * useRadarOpportunities — reads active radar opportunities (read-only consumer).
 * Engine computation runs in background via the opportunity scorer.
 *
 * Brain owner: Experience Brain
 * Phase: 1 Hardened
 */
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useGeoStore } from "@/lib/geo/geo-store";
import { computeOpportunities, persistOpportunities } from "@/lib/radar/opportunity-scorer";
import { useEffect, useRef } from "react";

const RECOMPUTE_INTERVAL_MS = 60_000;

export function useRadarOpportunities() {
  const gpsPoint = useGeoStore((s) => s.point);
  const lastCompute = useRef(0);
  const queryClient = useQueryClient();

  // Background engine recompute — writes to DB, then invalidates query
  useEffect(() => {
    const run = async () => {
      const now = Date.now();
      if (now - lastCompute.current < RECOMPUTE_INTERVAL_MS) return;
      lastCompute.current = now;

      const opps = await computeOpportunities(gpsPoint?.lat, gpsPoint?.lng);
      await persistOpportunities(opps);
      // Invalidate so UI re-reads from DB (UI is read-only consumer)
      queryClient.invalidateQueries({ queryKey: ["radar-opportunities"] });
    };

    void run();
    const interval = setInterval(run, RECOMPUTE_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [gpsPoint?.lat, gpsPoint?.lng, queryClient]);

  // Read-only: fetch active user opportunities from DB
  return useQuery({
    queryKey: ["radar-opportunities"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("radar_opportunities")
        .select("*")
        .eq("status", "active")
        .eq("target_audience", "user")
        .order("score", { ascending: false })
        .limit(8);

      if (error) throw error;
      return data ?? [];
    },
    refetchInterval: 30_000,
    staleTime: 15_000,
  });
}

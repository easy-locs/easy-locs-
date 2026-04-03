/**
 * dispatch-repository — DB operations for dispatch board.
 */
import { supabase } from "@/integrations/supabase/client";

export async function fetchDispatchBoardData() {
  const [rides, alerts, zones] = await Promise.all([
    (supabase as any).from("mobility_jobs").select("*").order("updated_at", { ascending: false }).limit(100),
    (supabase as any).from("admin_alerts").select("*").eq("status", "open").order("created_at", { ascending: false }).limit(50),
    (supabase as any).from("geo_live_zone_overlays").select("*").order("surge_multiplier", { ascending: false }).limit(50),
  ]);
  return {
    rides: rides.data ?? [],
    alerts: alerts.data ?? [],
    zones: zones.data ?? [],
  };
}

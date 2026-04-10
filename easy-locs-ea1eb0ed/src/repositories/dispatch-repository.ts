/**
 * dispatch-repository — DB operations for dispatch board.
 */
import { db } from "@/services/db";

export async function fetchDispatchBoardData() {
  const [rides, alerts, zones] = await Promise.all([
    db("mobility_jobs").select("*").order("updated_at", { ascending: false }).limit(100),
    db("admin_alerts").select("*").eq("status", "open").order("created_at", { ascending: false }).limit(50),
    db("geo_live_zone_overlays").select("*").order("surge_multiplier", { ascending: false }).limit(50),
  ]);
  return {
    rides: rides.data ?? [],
    alerts: alerts.data ?? [],
    zones: zones.data ?? [],
  };
}

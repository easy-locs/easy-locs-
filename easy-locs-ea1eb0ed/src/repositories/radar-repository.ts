/**
 * radar-repository — DB operations for radar live context.
 */
import { db } from "@/services/db";

export async function fetchRadarLiveData(mode: "client" | "rider" | "merchant" | "admin") {
  const [geoRes, eventsRes] = await Promise.all([
    db("geo_live_context").select("*"),
    db("zone_events").select("*").eq("is_active", true),
  ]);

  let riders: any[] = [];
  if (mode === "rider" || mode === "admin") {
    const { data } = await db("rider_runtime_state").select("*").eq("is_online", true);
    riders = data ?? [];
  }

  return {
    geoContexts: geoRes.data ?? [],
    riders,
    zoneEvents: eventsRes.data ?? [],
  };
}

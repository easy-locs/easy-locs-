/**
 * radar-repository — DB operations for radar live context.
 */
import { supabase } from "@/integrations/supabase/client";

export async function fetchRadarLiveData(mode: "client" | "rider" | "merchant" | "admin") {
  const [geoRes, eventsRes] = await Promise.all([
    (supabase as any).from("geo_live_context").select("*"),
    (supabase as any).from("zone_events").select("*").eq("is_active", true),
  ]);

  let riders: any[] = [];
  if (mode === "rider" || mode === "admin") {
    const { data } = await (supabase as any).from("rider_runtime_state").select("*").eq("is_online", true);
    riders = data ?? [];
  }

  return {
    geoContexts: geoRes.data ?? [],
    riders,
    zoneEvents: eventsRes.data ?? [],
  };
}

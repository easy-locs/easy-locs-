/**
 * zone-intelligence — Fetches real-time zone context from geo_live_zone_overlays.
 */
import { supabase } from "@/integrations/supabase/client";

export interface ZoneIntelligence {
  demand: number;
  supply: number;
  traffic: "low" | "moderate" | "heavy";
  surge: number;
}

export async function getZoneIntelligence(lat: number, lng: number): Promise<ZoneIntelligence> {
  const { data } = await supabase
    .from("geo_live_zone_overlays")
    .select("*")
    .limit(1)
    .maybeSingle();

  if (!data) {
    return { demand: 10, supply: 10, traffic: "moderate", surge: 1 };
  }

  return {
    demand: (data as any).demand_level ?? 10,
    supply: (data as any).supply_level ?? 10,
    traffic: ((data as any).traffic_level ?? "moderate") as ZoneIntelligence["traffic"],
    surge: Number((data as any).surge_multiplier ?? 1),
  };
}

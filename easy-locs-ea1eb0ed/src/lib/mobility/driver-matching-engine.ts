/**
 * driver-matching-engine — Finds nearby available drivers from rider_presence.
 */
import { supabase } from "@/integrations/supabase/client";

export interface NearbyDriver {
  id: string;
  user_id: string;
  lat: number;
  lng: number;
  distance: number;
  [key: string]: any;
}

export async function findNearbyDrivers(lat: number, lng: number): Promise<NearbyDriver[]> {
  const { data } = await supabase
    .from("rider_presence")
    .select("*")
    .eq("is_online", true)
    .limit(20);

  if (!data) return [];

  return (data as any[])
    .map((d) => {
      const dx = (d.lat ?? 0) - lat;
      const dy = (d.lng ?? 0) - lng;
      return { ...d, distance: Math.sqrt(dx * dx + dy * dy) } as NearbyDriver;
    })
    .sort((a, b) => a.distance - b.distance);
}

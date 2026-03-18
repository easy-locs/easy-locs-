/**
 * build-driver-clusters — Aggregate drivers into geo clusters.
 */
import { supabase } from "@/integrations/supabase/client";
import { toZoneKey, roundCoord } from "@/lib/geo/zone-utils";

type DriverLite = {
  id: string;
  lat: number;
  lng: number;
  status?: string;
};

export async function rebuildDriverClusters(params: {
  drivers: DriverLite[];
  city?: string;
}) {
  const activeDrivers = params.drivers.filter((d) => d.status !== "offline");

  const grouped = new Map<string, DriverLite[]>();

  for (const driver of activeDrivers) {
    const zoneKey = toZoneKey(driver.lat, driver.lng, 2);
    if (!grouped.has(zoneKey)) grouped.set(zoneKey, []);
    grouped.get(zoneKey)!.push(driver);
  }

  const rows = Array.from(grouped.entries()).map(([zoneKey, items]) => {
    const avgLat = items.reduce((s, x) => s + x.lat, 0) / items.length;
    const avgLng = items.reduce((s, x) => s + x.lng, 0) / items.length;

    return {
      zone_key: zoneKey,
      city: params.city ?? null,
      center_lat: roundCoord(avgLat, 4),
      center_lng: roundCoord(avgLng, 4),
      driver_count: items.length,
      demand_score: 0,
      cluster_score: +(items.length * 1).toFixed(2),
      updated_at: new Date().toISOString(),
    };
  });

  if (!rows.length) return { ok: true, count: 0 };

  const { error } = await supabase
    .from("driver_clusters" as any)
    .upsert(rows as any, { onConflict: "zone_key" } as any);

  if (error) throw error;

  return { ok: true, count: rows.length };
}

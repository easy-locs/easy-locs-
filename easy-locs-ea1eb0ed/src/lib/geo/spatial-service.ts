import { supabase } from "@/integrations/supabase/client";
import type { SpatialPoint } from "./postgis-spatial";

export interface NearbyResult {
  id: string;
  name: string;
  lat: number;
  lng: number;
  distance_meters: number;
  [key: string]: unknown;
}

export interface ZoneResult {
  zone_id: string;
  zone_name: string;
  zone_type: string;
}

export async function queryNearby(
  point: SpatialPoint,
  entityType: string,
  radiusMeters = 5000,
  limit = 50,
): Promise<NearbyResult[]> {
  const { data, error } = await supabase.functions.invoke("spatial-query", {
    body: {
      action: "nearby",
      lat: point.lat,
      lng: point.lng,
      entity_type: entityType,
      radius_meters: radiusMeters,
      limit,
    },
  });

  if (error) throw new Error(`Spatial query failed: ${error.message}`);
  return data?.results ?? [];
}

export async function queryAutoAssignZone(
  point: SpatialPoint,
): Promise<ZoneResult | null> {
  const { data, error } = await supabase.functions.invoke("spatial-query", {
    body: {
      action: "zone",
      lat: point.lat,
      lng: point.lng,
    },
  });

  if (error) throw new Error(`Zone assignment failed: ${error.message}`);
  return data?.zone ?? null;
}

export async function queryContainingZones(
  point: SpatialPoint,
): Promise<ZoneResult[]> {
  const { data, error } = await supabase.functions.invoke("spatial-query", {
    body: {
      action: "contains",
      lat: point.lat,
      lng: point.lng,
    },
  });

  if (error) throw new Error(`Containment query failed: ${error.message}`);
  return data?.zones ?? [];
}

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

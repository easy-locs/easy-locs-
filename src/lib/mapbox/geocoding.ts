/**
 * @deprecated — Use @/lib/location/geocode.ts (reverseGeocode, searchPlaces) instead.
 * This file is kept for any remaining direct consumers.
 */
import { MAPBOX_ACCESS_TOKEN } from "@/lib/mapbox/config";

export async function forwardGeocode(query: string) {
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
    query
  )}.json?limit=5&access_token=${MAPBOX_ACCESS_TOKEN}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error("Geocoding failed");
  return res.json();
}

export async function reverseGeocode(lat: number, lng: number) {
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?limit=1&access_token=${MAPBOX_ACCESS_TOKEN}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error("Reverse geocoding failed");
  return res.json();
}

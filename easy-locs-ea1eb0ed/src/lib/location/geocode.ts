/**
 * geocode.ts — Reverse geocoding & place search via Mapbox.
 * Normalizes results, caches, debounces.
 * 
 * Provider contextualization: accepts country filter + proximity bias
 * so Search Brain receives enough local candidates.
 */

import { MAPBOX_ACCESS_TOKEN as TOKEN } from "@/lib/mapbox/config";

export interface NormalizedPlace {
  label: string;
  street?: string;
  area?: string;
  city?: string;
  region?: string;
  country?: string;
  postcode?: string;
  lat: number;
  lng: number;
}

// ─── Caches ───
const reverseCache = new Map<string, { result: NormalizedPlace; ts: number }>();
const searchCache = new Map<string, { results: NormalizedPlace[]; ts: number }>();
const CACHE_TTL = 5 * 60_000; // 5 min

function cacheKey(lat: number, lng: number): string {
  return `${lat.toFixed(4)},${lng.toFixed(4)}`;
}

function extractContext(contexts: any[], type: string): string | undefined {
  const c = contexts?.find((ctx: any) => ctx.id?.startsWith(type));
  return c?.text;
}

function normalizeFeature(f: any): NormalizedPlace {
  const ctx = f.context || [];
  return {
    label: f.place_name || f.text || "",
    street: f.text,
    area: extractContext(ctx, "neighborhood") || extractContext(ctx, "locality"),
    city: extractContext(ctx, "place"),
    region: extractContext(ctx, "region"),
    country: extractContext(ctx, "country"),
    postcode: extractContext(ctx, "postcode"),
    lat: f.center?.[1] ?? f.geometry?.coordinates?.[1] ?? 0,
    lng: f.center?.[0] ?? f.geometry?.coordinates?.[0] ?? 0,
  };
}

export async function reverseGeocode(lat: number, lng: number): Promise<NormalizedPlace> {
  const key = cacheKey(lat, lng);
  const cached = reverseCache.get(key);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.result;

  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?limit=1&access_token=${TOKEN}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Reverse geocode failed");

  const json = await res.json();
  const feature = json.features?.[0];
  if (!feature) {
    return { label: `${lat.toFixed(5)}, ${lng.toFixed(5)}`, lat, lng };
  }

  const result = normalizeFeature(feature);
  reverseCache.set(key, { result, ts: Date.now() });
  return result;
}

export async function searchPlaces(
  query: string,
  options?: {
    proximity?: { lat: number; lng: number };
    limit?: number;
    /** ISO 2-letter country code to bias/filter results (e.g. "AE") */
    country?: string;
    /** Bounding box [minLng, minLat, maxLng, maxLat] */
    bbox?: [number, number, number, number];
  },
): Promise<NormalizedPlace[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const cKey = `${trimmed.toLowerCase()}_${options?.proximity?.lat?.toFixed(2) || ""}_${options?.country || ""}`;
  const cached = searchCache.get(cKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.results;

  let url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(trimmed)}.json?limit=${options?.limit || 5}&access_token=${TOKEN}`;
  
  // Proximity bias — Mapbox will prefer results near this point
  if (options?.proximity) {
    url += `&proximity=${options.proximity.lng},${options.proximity.lat}`;
  }
  
  // Country filter — restricts results to specific country (ISO 3166-1 alpha-2)
  if (options?.country) {
    url += `&country=${options.country.toLowerCase()}`;
  }
  
  // Bounding box filter
  if (options?.bbox) {
    url += `&bbox=${options.bbox.join(",")}`;
  }

  const res = await fetch(url);
  if (!res.ok) throw new Error("Place search failed");

  const json = await res.json();
  const results: NormalizedPlace[] = (json.features || []).map(normalizeFeature);
  searchCache.set(cKey, { results, ts: Date.now() });
  return results;
}

export async function getDirections(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
): Promise<{ geometry: any; distance_m: number; duration_s: number } | null> {
  const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?geometries=geojson&overview=full&access_token=${TOKEN}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const json = await res.json();
  const route = json.routes?.[0];
  if (!route) return null;
  return {
    geometry: route.geometry,
    distance_m: route.distance,
    duration_s: route.duration,
  };
}

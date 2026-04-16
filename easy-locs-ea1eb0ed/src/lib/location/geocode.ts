import { getMapLanguage } from "@/lib/navigation/locale-voice-map";

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

const reverseCache = new Map<string, { result: NormalizedPlace; ts: number }>();
const searchCache = new Map<string, { results: NormalizedPlace[]; ts: number }>();
const CACHE_TTL = 5 * 60_000;

function cacheKey(lat: number, lng: number): string {
  return `${lat.toFixed(4)},${lng.toFixed(4)}`;
}

function normalizeNominatimResult(r: any): NormalizedPlace {
  const addr = r.address || {};
  return {
    label: r.display_name || "",
    street: addr.road || addr.pedestrian || addr.footway,
    area: addr.neighbourhood || addr.suburb || addr.hamlet,
    city: addr.city || addr.town || addr.village || addr.municipality,
    region: addr.state || addr.county,
    country: addr.country,
    postcode: addr.postcode,
    lat: parseFloat(r.lat),
    lng: parseFloat(r.lon),
  };
}

export async function reverseGeocode(lat: number, lng: number): Promise<NormalizedPlace> {
  const key = cacheKey(lat, lng);
  const cached = reverseCache.get(key);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.result;

  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`;
  const res = await fetch(url, {
    headers: { "User-Agent": "EasyLocs/1.0" },
  });
  if (!res.ok) throw new Error("Reverse geocode failed");

  const json = await res.json();
  if (!json || json.error) {
    return { label: `${lat.toFixed(5)}, ${lng.toFixed(5)}`, lat, lng };
  }

  const result = normalizeNominatimResult(json);
  reverseCache.set(key, { result, ts: Date.now() });
  return result;
}

export async function searchPlaces(
  query: string,
  options?: {
    proximity?: { lat: number; lng: number };
    limit?: number;
    country?: string;
    bbox?: [number, number, number, number];
  },
): Promise<NormalizedPlace[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const cKey = `${trimmed.toLowerCase()}_${options?.proximity?.lat?.toFixed(2) || ""}_${options?.country || ""}`;
  const cached = searchCache.get(cKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.results;

  let url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(trimmed)}&format=json&limit=${options?.limit || 5}&addressdetails=1`;

  if (options?.country) {
    url += `&countrycodes=${options.country.toLowerCase()}`;
  }

  if (options?.bbox) {
    url += `&viewbox=${options.bbox.join(",")}&bounded=1`;
  }

  const res = await fetch(url, {
    headers: { "User-Agent": "EasyLocs/1.0" },
  });
  if (!res.ok) throw new Error("Place search failed");

  const json = await res.json();
  let results: NormalizedPlace[] = (json || []).map(normalizeNominatimResult);

  if (options?.proximity && results.length > 1) {
    const { lat: pLat, lng: pLng } = options.proximity;
    results.sort((a, b) => {
      const dA = Math.abs(a.lat - pLat) + Math.abs(a.lng - pLng);
      const dB = Math.abs(b.lat - pLat) + Math.abs(b.lng - pLng);
      return dA - dB;
    });
  }

  searchCache.set(cKey, { results, ts: Date.now() });
  return results;
}

export interface DirectionsStep {
  maneuver: {
    instruction: string;
    location: [number, number];
    type: string;
    modifier?: string;
  };
  distance: number;
  duration: number;
  name: string;
  voiceInstructions?: Array<{
    distanceAlongGeometry: number;
    announcement: string;
    ssmlAnnouncement?: string;
  }>;
}

export interface DirectionsResult {
  geometry: any;
  distance_m: number;
  duration_s: number;
  duration_typical_s: number | null;
  steps: DirectionsStep[];
}

const OSRM_PROFILES: Record<string, string> = {
  driving: "car",
  "driving-traffic": "car",
  walking: "foot",
  cycling: "bike",
};

export async function getDirections(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
  profile: "driving" | "driving-traffic" | "walking" | "cycling" = "driving",
  _locale?: string,
): Promise<DirectionsResult | null> {
  const osrmProfile = OSRM_PROFILES[profile] || "car";
  const coords = `${origin.lng},${origin.lat};${destination.lng},${destination.lat}`;
  const url = `https://router.project-osrm.org/route/v1/${osrmProfile === "car" ? "driving" : osrmProfile === "foot" ? "walking" : "cycling"}/${coords}?overview=full&geometries=geojson&steps=true`;

  const res = await fetch(url);
  if (!res.ok) return null;

  const json = await res.json();
  if (json.code !== "Ok") return null;

  const route = json.routes?.[0];
  if (!route) return null;

  const steps: DirectionsStep[] = (route.legs ?? []).flatMap((leg: any) =>
    (leg.steps ?? []).map((s: any) => ({
      maneuver: {
        instruction: s.name ? `Continue on ${s.name}` : s.maneuver?.type || "Continue",
        location: s.maneuver?.location ?? [0, 0],
        type: s.maneuver?.type ?? "",
        modifier: s.maneuver?.modifier,
      },
      distance: s.distance ?? 0,
      duration: s.duration ?? 0,
      name: s.name ?? "",
      voiceInstructions: s.name ? [{
        distanceAlongGeometry: s.distance ?? 0,
        announcement: s.name ? `Continue on ${s.name}` : "Continue",
      }] : [],
    })),
  );

  return {
    geometry: route.geometry,
    distance_m: route.distance,
    duration_s: route.duration,
    duration_typical_s: null,
    steps,
  };
}

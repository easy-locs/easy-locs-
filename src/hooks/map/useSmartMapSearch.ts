/**
 * useSmartMapSearch — Orchestrates map search with brand/service detection + OSM.
 * Single entry point for all map search interactions.
 * Uses unified mapStore.
 */
import { useCallback, useRef } from "react";
import { useUnifiedMapStore } from "@/stores/mapStore";
import { useLocationStore } from "@/stores/locationStore";
import { detectMapSearchIntent, filterAndRankResults } from "@/lib/map/smart-map-search";

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
const SEARCH_DEBOUNCE = 400;

function buildOverpassQuery(lat: number, lng: number, radiusM: number = 3000): string {
  return `[out:json][timeout:10];
(
  node["amenity"~"restaurant|cafe|fast_food|bar|bakery|ice_cream|pharmacy|hospital|clinic|dentist|bank|atm|fuel|car_wash|car_repair|school|kindergarten|post_office"](around:${radiusM},${lat},${lng});
  node["shop"~"supermarket|convenience|greengrocer|butcher|clothes|shoes|electronics|mobile_phone|jewelry|optician|books|furniture|hardware|mall|department_store|hairdresser|beauty|laundry"](around:${radiusM},${lat},${lng});
  node["leisure"~"fitness_centre|gym"](around:${radiusM},${lat},${lng});
  node["tourism"~"hotel"](around:${radiusM},${lat},${lng});
);
out body 300;`;
}

// Cache OSM data per geo bucket to avoid hammering
const osmCache = new Map<string, { data: any[]; ts: number }>();
const CACHE_TTL = 60_000;

async function fetchOSMData(lat: number, lng: number): Promise<any[]> {
  const bucket = `${lat.toFixed(2)},${lng.toFixed(2)}`;
  const cached = osmCache.get(bucket);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data;

  try {
    const res = await fetch(OVERPASS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `data=${encodeURIComponent(buildOverpassQuery(lat, lng))}`,
    });
    if (!res.ok) {
      return cached?.data || [];
    }
    const json = await res.json();
    const elements = json.elements || [];
    osmCache.set(bucket, { data: elements, ts: Date.now() });
    return elements;
  } catch {
    return cached?.data || [];
  }
}

export function useSmartMapSearch() {
  const store = useUnifiedMapStore;
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const runSearch = useCallback(async (query: string) => {
    const q = query.trim();

    store.getState().setSearchQuery(q);

    if (q.length < 2) {
      store.getState().clearSearch();
      return;
    }

    // Detect intent
    const intent = detectMapSearchIntent(q);
    store.getState().setSearchIntent(intent);
    store.getState().setSearchStatus("searching");

    // Get origin — read from locationStore (canonical GPS source)
    const loc = useLocationStore.getState().currentLocation;
    const viewport = store.getState().viewport;
    const origin = loc?.lat != null && loc?.lng != null
      ? { lat: loc.lat, lng: loc.lng }
      : { lat: viewport.centerLat, lng: viewport.centerLng };

    try {
      const elements = await fetchOSMData(origin.lat, origin.lng);
      const results = filterAndRankResults(elements, intent, origin);
      store.getState().setSearchResults(results);

      // If results found, show sheet
      if (results.length > 0) {
        store.getState().setSheetSnap("half");
      }
    } catch {
      store.getState().setSearchStatus("error");
    }
  }, []);

  const debouncedSearch = useCallback((query: string) => {
    clearTimeout(timerRef.current);
    store.getState().setSearchQuery(query);
    if (query.trim().length < 2) {
      store.getState().clearSearch();
      return;
    }
    timerRef.current = setTimeout(() => runSearch(query), SEARCH_DEBOUNCE);
  }, [runSearch]);

  const clearSearch = useCallback(() => {
    clearTimeout(timerRef.current);
    store.getState().clearSearch();
  }, []);

  return { runSearch, debouncedSearch, clearSearch };
}

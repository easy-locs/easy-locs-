/**
 * useReverseGeocode — Convert GPS coordinates to human-readable address.
 * 
 * Uses Mapbox reverse geocoding API.
 * Features:
 * - Caching to avoid redundant requests
 * - Debounced to prevent rapid fire
 * - Fallback to coordinates display
 */
import { useState, useCallback, useRef, useEffect } from "react";

const MAPBOX_TOKEN = "pk.eyJ1IjoiZWFzeWxvY3MyMDI2IiwiYSI6ImNtbXZiZ3h0cTF6ZHMycnIyOWw4NnJzZTIifQ.ElIj6bFQK_BpVm6suigHUQ";

export interface GeocodedAddress {
  fullAddress: string;
  street?: string;
  city?: string;
  region?: string;
  country?: string;
  postalCode?: string;
  neighborhood?: string;
}

const cache = new Map<string, GeocodedAddress>();

function cacheKey(lat: number, lng: number): string {
  return `${lat.toFixed(4)},${lng.toFixed(4)}`;
}

export function useReverseGeocode() {
  const [address, setAddress] = useState<GeocodedAddress | null>(null);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const geocode = useCallback(async (lat: number, lng: number): Promise<GeocodedAddress | null> => {
    const key = cacheKey(lat, lng);
    const cached = cache.get(key);
    if (cached) {
      setAddress(cached);
      return cached;
    }

    // Abort previous
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setLoading(true);
    try {
      const res = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_TOKEN}&types=address,place,neighborhood&limit=1`,
        { signal: abortRef.current.signal },
      );

      if (!res.ok) throw new Error("Geocoding failed");

      const data = await res.json();
      const feature = data.features?.[0];

      if (!feature) {
        const fallback: GeocodedAddress = {
          fullAddress: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
        };
        setAddress(fallback);
        return fallback;
      }

      const context = (feature.context || []) as Array<{ id: string; text: string }>;
      const getCtx = (prefix: string) => context.find(c => c.id.startsWith(prefix))?.text;

      const result: GeocodedAddress = {
        fullAddress: feature.place_name || feature.text,
        street: feature.text,
        neighborhood: getCtx("neighborhood"),
        city: getCtx("place"),
        region: getCtx("region"),
        country: getCtx("country"),
        postalCode: getCtx("postcode"),
      };

      cache.set(key, result);
      setAddress(result);
      return result;
    } catch (err: any) {
      if (err.name === "AbortError") return null;
      console.warn("[ReverseGeocode] Error:", err);
      const fallback: GeocodedAddress = {
        fullAddress: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
      };
      setAddress(fallback);
      return fallback;
    } finally {
      setLoading(false);
    }
  }, []);

  /** Debounced version — waits 300ms before geocoding */
  const geocodeDebounced = useCallback((lat: number, lng: number) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => geocode(lat, lng), 300);
  }, [geocode]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return { address, loading, geocode, geocodeDebounced };
}

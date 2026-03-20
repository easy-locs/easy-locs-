/**
 * useAddressSearch — Debounced place search with proximity bias.
 */
import { useState, useEffect, useRef } from "react";
import { searchPlaces, type NormalizedPlace } from "@/lib/location/geocode";
import { useLocationStore } from "@/stores/locationStore";

export function useAddressSearch(query: string, opts?: { debounceMs?: number; enabled?: boolean }) {
  const [results, setResults] = useState<NormalizedPlace[]>([]);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const currentLocation = useLocationStore((s) => s.currentLocation);
  const enabled = opts?.enabled !== false;
  const debounce = opts?.debounceMs ?? 300;

  useEffect(() => {
    if (!enabled || query.trim().length < 2) {
      setResults([]);
      return;
    }

    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const proximity = currentLocation ? { lat: currentLocation.lat, lng: currentLocation.lng } : undefined;
        const res = await searchPlaces(query, { proximity, limit: 5 });
        setResults(res);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, debounce);

    return () => clearTimeout(timerRef.current);
  }, [query, enabled, debounce, currentLocation]);

  return { results, loading };
}

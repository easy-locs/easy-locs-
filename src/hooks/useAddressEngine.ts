/**
 * useAddressEngine — Hook for Uber/Careem-like address prefill and search.
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { useLocationStore } from "@/stores/locationStore";
import {
  resolveBestAddress,
  getSavedAddresses,
  searchAddresses,
  touchAddressUsed,
  saveAddress,
  type ResolvedAddress,
} from "@/lib/address/address-engine";

export function useAddressEngine() {
  const currentLocation = useLocationStore((s) => s.currentLocation);
  const geo = { lat: currentLocation?.lat ?? null, lng: currentLocation?.lng ?? null, effectiveCity: null as string | null };
  const [bestAddress, setBestAddress] = useState<ResolvedAddress | null>(null);
  const [savedAddresses, setSavedAddresses] = useState<ResolvedAddress[]>([]);
  const [searchResults, setSearchResults] = useState<ResolvedAddress[]>([]);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(true);
  const [statusText, setStatusText] = useState("Locating you...");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const loadedRef = useRef(false);

  // Load best address + saved addresses on mount
  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;

    (async () => {
      setLoading(true);
      try {
        const [best, saved] = await Promise.all([
          resolveBestAddress(geo.lat, geo.lng, geo.effectiveCity),
          getSavedAddresses(),
        ]);
        setBestAddress(best);
        setSavedAddresses(saved);

        const statusMap: Record<string, string> = {
          default: "Using saved address",
          last_used: "Using last address",
          current_location: "Using current location",
          city_fallback: "Using default city",
        };
        setStatusText(statusMap[best.source] ?? "Address ready");
      } catch {
        setStatusText("Could not load address");
      } finally {
        setLoading(false);
      }
    })();
  }, [geo.lat, geo.lng, geo.effectiveCity]);

  // Re-resolve when geolocation updates
  useEffect(() => {
    if (!loadedRef.current || !geo.lat || !geo.lng) return;
    // Only update if we were on fallback
    if (bestAddress?.source === "city_fallback") {
      resolveBestAddress(geo.lat, geo.lng, geo.effectiveCity).then((addr) => {
        setBestAddress(addr);
        const statusMap: Record<string, string> = {
          default: "Using saved address",
          last_used: "Using last address",
          current_location: "Using current location",
          city_fallback: "Using default city",
        };
        setStatusText(statusMap[addr.source] ?? "Address ready");
      });
    }
  }, [geo.lat, geo.lng]);

  const search = useCallback((query: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      const results = await searchAddresses(query);
      setSearchResults(results);
      setSearching(false);
    }, 250);
  }, []);

  const selectAddress = useCallback(async (addr: ResolvedAddress) => {
    setBestAddress(addr);
    if (addr.id) {
      await touchAddressUsed(addr.id);
    }
  }, []);

  const home = savedAddresses.find((a) => a.label?.toLowerCase() === "home") ?? null;
  const work = savedAddresses.find((a) => a.label?.toLowerCase() === "work") ?? null;

  return {
    bestAddress,
    savedAddresses,
    searchResults,
    searching,
    loading,
    statusText,
    home,
    work,
    geo,
    search,
    selectAddress,
    saveAddress,
    refreshAddresses: async () => {
      const saved = await getSavedAddresses();
      setSavedAddresses(saved);
    },
  };
}

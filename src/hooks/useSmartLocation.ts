/**
 * @deprecated — LEGACY local-storage-based location system.
 * New code should use useCanonicalAddress() from @/hooks/useCanonicalAddress.
 * Kept temporarily for CanonicalAddressInput fallback and SendMap/SmartLocationPicker.
 */
import { useState, useEffect, useCallback } from "react";
import { useLocationStore } from "@/stores/locationStore";

export interface SavedPlace {
  id: string;
  label: string;
  type: "home" | "work" | "favorite" | "recent";
  address: string;
  city?: string;
  lat?: number;
  lng?: number;
  icon: string;
}

const STORAGE_KEY = "orbit:saved-places";

const DEFAULT_PLACES: SavedPlace[] = [
  { id: "home", label: "Home", type: "home", address: "", city: "", icon: "🏠" },
  { id: "work", label: "Work", type: "work", address: "", city: "", icon: "💼" },
];

function loadPlaces(): SavedPlace[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PLACES;
    const parsed = JSON.parse(raw) as SavedPlace[];
    // Ensure home & work always exist
    const hasHome = parsed.some(p => p.id === "home");
    const hasWork = parsed.some(p => p.id === "work");
    const result = [...parsed];
    if (!hasHome) result.unshift(DEFAULT_PLACES[0]);
    if (!hasWork) result.splice(1, 0, DEFAULT_PLACES[1]);
    return result;
  } catch {
    return DEFAULT_PLACES;
  }
}

function savePlaces(places: SavedPlace[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(places));
  } catch { /* quota */ }
}

export function useSmartLocation() {
  const storeLocation = useLocationStore((s) => s.currentLocation);
  const loading = useLocationStore((s) => s.loading);
  const geo = { lat: storeLocation?.lat ?? null, lng: storeLocation?.lng ?? null, effectiveCity: null as string | null, loading };
  const [places, setPlaces] = useState<SavedPlace[]>(loadPlaces);
  const [activePlace, setActivePlace] = useState<SavedPlace | null>(null);

  // Persist on change
  useEffect(() => { savePlaces(places); }, [places]);

  const currentLocation: SavedPlace | null = geo.lat && geo.lng ? {
    id: "current",
    label: "Current Location",
    type: "recent",
    address: geo.effectiveCity || "Locating…",
    city: geo.effectiveCity || undefined,
    lat: geo.lat,
    lng: geo.lng,
    icon: "📍",
  } : null;

  const savePlace = useCallback((place: Omit<SavedPlace, "id"> & { id?: string }) => {
    setPlaces(prev => {
      const id = place.id || `place-${Date.now()}`;
      const existing = prev.findIndex(p => p.id === id);
      const updated = { ...place, id } as SavedPlace;
      if (existing >= 0) {
        const next = [...prev];
        next[existing] = updated;
        return next;
      }
      return [...prev, updated];
    });
  }, []);

  const addRecent = useCallback((address: string, city?: string, lat?: number, lng?: number) => {
    setPlaces(prev => {
      // Deduplicate
      const exists = prev.find(p => p.type === "recent" && p.address === address);
      if (exists) return prev;
      const recent: SavedPlace = {
        id: `recent-${Date.now()}`,
        label: city || address.split(",")[0]?.trim() || "Address",
        type: "recent",
        address,
        city,
        lat,
        lng,
        icon: "🕐",
      };
      // Keep max 5 recent
      const recents = prev.filter(p => p.type === "recent");
      if (recents.length >= 5) {
        const oldest = recents[recents.length - 1];
        return [...prev.filter(p => p.id !== oldest.id), recent];
      }
      return [...prev, recent];
    });
  }, []);

  const removePlace = useCallback((id: string) => {
    if (id === "home" || id === "work") {
      // Reset but don't remove
      setPlaces(prev => prev.map(p => p.id === id ? { ...p, address: "", city: "", lat: undefined, lng: undefined } : p));
    } else {
      setPlaces(prev => prev.filter(p => p.id !== id));
    }
  }, []);

  const home = places.find(p => p.id === "home") || null;
  const work = places.find(p => p.id === "work") || null;
  const favorites = places.filter(p => p.type === "favorite");
  const recents = places.filter(p => p.type === "recent");
  const configured = places.filter(p => (p.id === "home" || p.id === "work") ? !!p.address : true);

  return {
    geo,
    currentLocation,
    places: configured,
    home,
    work,
    favorites,
    recents,
    activePlace,
    setActivePlace,
    savePlace,
    addRecent,
    removePlace,
  };
}

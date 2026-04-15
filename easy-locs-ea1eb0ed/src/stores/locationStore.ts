/**
 * locationStore — SINGLE source of truth for all location state.
 * GPS data is synced FROM geoStore (src/lib/geo/geo-store.ts).
 * This store adds saved places, pickup/dropoff, map viewport on top.
 */
import { useEffect, useRef } from "react";
import { create } from "zustand";
import { useGeoStore } from "@/lib/geo/geo-store";

export type AccuracyLevel = "exact" | "approximate" | "fallback";
export type PermissionState = "granted" | "denied" | "prompt" | "unavailable" | "timeout" | "unknown";

export interface LocationPoint {
  lat: number;
  lng: number;
  accuracy?: number | null;
  timestamp?: string | null;
}

export interface ResolvedPlace {
  lat: number;
  lng: number;
  label: string;
  street?: string;
  area?: string;
  city?: string;
  region?: string;
  country?: string;
  postcode?: string;
}

export interface SavedPlace extends ResolvedPlace {
  id: string;
  type: "home" | "work" | "saved" | "recent";
}

/** Classify GPS accuracy into explicit tiers */
export function classifyAccuracy(meters: number | null | undefined): AccuracyLevel {
  if (meters == null) return "fallback";
  if (meters <= 50) return "exact";
  if (meters <= 500) return "approximate";
  return "fallback";
}

interface LocationState {
  // GPS — synced from geoStore
  currentLocation: LocationPoint | null;
  lastKnownLocation: LocationPoint | null;
  permissionState: PermissionState;
  accuracyLevel: AccuracyLevel;
  loading: boolean;
  error: string | null;
  isFallback: boolean;

  // Selected / pickup / dropoff
  selectedLocation: ResolvedPlace | null;
  pickupLocation: ResolvedPlace | null;
  dropoffLocation: ResolvedPlace | null;

  searchRadiusKm: number;

  // Saved places
  savedPlaces: SavedPlace[];
  recentPlaces: SavedPlace[];

  // Actions
  setCurrentLocation: (loc: LocationPoint) => void;
  setLastKnownLocation: (loc: LocationPoint) => void;
  setPermissionState: (state: PermissionState) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setIsFallback: (val: boolean) => void;
  setSelectedLocation: (place: ResolvedPlace | null) => void;
  setPickupLocation: (place: ResolvedPlace | null) => void;
  setDropoffLocation: (place: ResolvedPlace | null) => void;
  setSearchRadiusKm: (km: number) => void;
  addRecentPlace: (place: Omit<SavedPlace, "id" | "type">) => void;
  savePlace: (place: SavedPlace) => void;
  removePlace: (id: string) => void;
  resetLocationState: () => void;

  // Convenience getters
  getLat: () => number | null;
  getLng: () => number | null;
}

const STORAGE_KEY = "loc:saved-places";
const RECENT_KEY = "loc:recent-places";
const STORAGE_VERSION = 2;
const MAX_RECENT = 8;

function loadVersioned<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    if (parsed?._version === STORAGE_VERSION && Array.isArray(parsed.data)) {
      return parsed.data;
    }
    if (Array.isArray(parsed)) {
      persistVersioned(key, parsed);
      return parsed as T;
    }
    return fallback;
  } catch {
    return fallback;
  }
}

function persistVersioned(key: string, data: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify({ _version: STORAGE_VERSION, data }));
  } catch {}
}

function loadSaved(): SavedPlace[] {
  return loadVersioned<SavedPlace[]>(STORAGE_KEY, []);
}
function loadRecent(): SavedPlace[] {
  return loadVersioned<SavedPlace[]>(RECENT_KEY, []);
}
function persistSaved(places: SavedPlace[]) {
  persistVersioned(STORAGE_KEY, places);
}
function persistRecent(places: SavedPlace[]) {
  persistVersioned(RECENT_KEY, places);
}

export const useLocationStore = create<LocationState>((set, get) => ({
  currentLocation: null,
  lastKnownLocation: null,
  permissionState: "unknown",
  accuracyLevel: "fallback",
  loading: false,
  error: null,
  isFallback: false,
  selectedLocation: null,
  pickupLocation: null,
  dropoffLocation: null,
  searchRadiusKm: 5,
  savedPlaces: loadSaved(),
  recentPlaces: loadRecent(),

  setCurrentLocation: (loc) => set({
    currentLocation: loc,
    lastKnownLocation: loc,
    isFallback: false,
    error: null,
    accuracyLevel: classifyAccuracy(loc.accuracy),
  }),
  setLastKnownLocation: (loc) => set({ lastKnownLocation: loc }),
  setPermissionState: (state) => set({ permissionState: state }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setIsFallback: (val) => set({ isFallback: val, accuracyLevel: val ? "fallback" : get().accuracyLevel }),
  setSelectedLocation: (place) => set({ selectedLocation: place }),
  setPickupLocation: (place) => set({ pickupLocation: place }),
  setDropoffLocation: (place) => set({ dropoffLocation: place }),
  setSearchRadiusKm: (km) => set({ searchRadiusKm: km }),

  addRecentPlace: (place) => {
    const recent = get().recentPlaces;
    const exists = recent.find(r => r.lat === place.lat && r.lng === place.lng);
    if (exists) return;
    const entry: SavedPlace = { ...place, id: `recent-${Date.now()}`, type: "recent" };
    const next = [entry, ...recent].slice(0, MAX_RECENT);
    set({ recentPlaces: next });
    persistRecent(next);
  },

  savePlace: (place) => {
    const saved = get().savedPlaces;
    const idx = saved.findIndex(s => s.id === place.id);
    const next = idx >= 0 ? saved.map((s, i) => i === idx ? place : s) : [...saved, place];
    set({ savedPlaces: next });
    persistSaved(next);
  },

  removePlace: (id) => {
    const saved = get().savedPlaces.filter(s => s.id !== id);
    const recent = get().recentPlaces.filter(r => r.id !== id);
    set({ savedPlaces: saved, recentPlaces: recent });
    persistSaved(saved);
    persistRecent(recent);
  },

  resetLocationState: () => set({
    selectedLocation: null,
    pickupLocation: null,
    dropoffLocation: null,
    error: null,
    loading: false,
  }),

  getLat: () => get().currentLocation?.lat ?? null,
  getLng: () => get().currentLocation?.lng ?? null,
}));

/**
 * useGeoSync — React hook that syncs geoStore → locationStore.
 * B5 fix: Moved from module-level subscription to a React hook with proper cleanup.
 * Must be mounted once in the app tree (e.g. in AppInit or a root provider).
 *
 * Uses useEffect to avoid render-loop churn: writes only happen when geo values change.
 */
export function useGeoSync(): void {
  const prevRef = useRef<string>("");

  useEffect(() => {
    const unsub = useGeoStore.subscribe((geoState) => {
      const fingerprint = `${geoState.point?.lat},${geoState.point?.lng},${geoState.permission},${geoState.loading},${geoState.error},${geoState.ready}`;
      if (fingerprint === prevRef.current) return;
      prevRef.current = fingerprint;

      const locStore = useLocationStore.getState();

      if (geoState.point) {
        const loc: LocationPoint = {
          lat: geoState.point.lat,
          lng: geoState.point.lng,
          accuracy: geoState.point.accuracy,
          timestamp: new Date(geoState.point.timestamp).toISOString(),
        };
        locStore.setCurrentLocation(loc);
      }

      const permMap: Record<string, PermissionState> = {
        granted: "granted",
        denied: "denied",
        prompt: "prompt",
        unknown: "unknown",
      };
      const mappedPerm = permMap[geoState.permission] || "unknown";
      if (mappedPerm !== locStore.permissionState) locStore.setPermissionState(mappedPerm);
      if (geoState.loading !== locStore.loading) locStore.setLoading(geoState.loading);
      if (geoState.error !== locStore.error) locStore.setError(geoState.error);

      const isFallback = geoState.ready && !geoState.point;
      if (isFallback !== locStore.isFallback) locStore.setIsFallback(isFallback);
    });
    return unsub;
  }, []);
}

/**
 * locationStore — Single source of truth for all location state.
 * Used by Explorer, Ride, Send Package, Home, Search.
 */
import { create } from "zustand";

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

type PermissionState = "granted" | "denied" | "prompt" | "unknown";

interface LocationState {
  // GPS
  currentLocation: LocationPoint | null;
  lastKnownLocation: LocationPoint | null;
  permissionState: PermissionState;
  loading: boolean;
  error: string | null;
  isFallback: boolean;

  // Selected / pickup / dropoff
  selectedLocation: ResolvedPlace | null;
  pickupLocation: ResolvedPlace | null;
  dropoffLocation: ResolvedPlace | null;

  // Map viewport
  mapCenter: { lat: number; lng: number } | null;
  mapZoom: number;
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
  setMapViewport: (center: { lat: number; lng: number }, zoom?: number) => void;
  setSearchRadiusKm: (km: number) => void;
  addRecentPlace: (place: Omit<SavedPlace, "id" | "type">) => void;
  savePlace: (place: SavedPlace) => void;
  removePlace: (id: string) => void;
  resetLocationState: () => void;
}

const STORAGE_KEY = "loc:saved-places";
const RECENT_KEY = "loc:recent-places";
const MAX_RECENT = 8;

function loadSaved(): SavedPlace[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch { return []; }
}

function loadRecent(): SavedPlace[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
  } catch { return []; }
}

function persistSaved(places: SavedPlace[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(places)); } catch {}
}

function persistRecent(places: SavedPlace[]) {
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(places)); } catch {}
}

export const useLocationStore = create<LocationState>((set, get) => ({
  currentLocation: null,
  lastKnownLocation: null,
  permissionState: "unknown",
  loading: false,
  error: null,
  isFallback: false,
  selectedLocation: null,
  pickupLocation: null,
  dropoffLocation: null,
  mapCenter: null,
  mapZoom: 13,
  searchRadiusKm: 5,
  savedPlaces: loadSaved(),
  recentPlaces: loadRecent(),

  setCurrentLocation: (loc) => set({ currentLocation: loc, lastKnownLocation: loc, isFallback: false, error: null }),
  setLastKnownLocation: (loc) => set({ lastKnownLocation: loc }),
  setPermissionState: (state) => set({ permissionState: state }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setIsFallback: (val) => set({ isFallback: val }),
  setSelectedLocation: (place) => set({ selectedLocation: place }),
  setPickupLocation: (place) => set({ pickupLocation: place }),
  setDropoffLocation: (place) => set({ dropoffLocation: place }),
  setMapViewport: (center, zoom) => set({ mapCenter: center, ...(zoom != null ? { mapZoom: zoom } : {}) }),
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
    const next = idx >= 0
      ? saved.map((s, i) => i === idx ? place : s)
      : [...saved, place];
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
}));

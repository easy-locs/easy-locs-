/**
 * useGeoLiveStation — Provides live Geo Station data for any surface.
 * Automatically fetches zone overlay + ETA projection based on:
 * 1. radarPlaceStore selectedPlace (if set)
 * 2. locationStore currentLocation (GPS fallback)
 * 
 * Listens to core event bus for radar.context.refresh to auto-refetch.
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { useRadarPlaceStore } from "@/stores/radarPlaceStore";
import { useLocationStore } from "@/stores/locationStore";
import { getZoneOverlay, type ZoneOverlay } from "@/lib/radar/radar-place-search-adapter";
import { projectETAs, overlayToStation, type ETAProjection, type GeoLiveStation } from "@/lib/radar/eta-projection-engine";
import { computeZoneKey } from "@/lib/address/canonical-place";
import { eventBus } from "@/lib/core/event-bus";

interface GeoLiveStationState {
  zoneKey: string | null;
  overlay: ZoneOverlay | null;
  station: GeoLiveStation | null;
  etas: ETAProjection;
  loading: boolean;
  label: string | null;
}

const EMPTY_ETAS: ETAProjection = { food: null, grocery: null, taxi: null, parcel: null };

export function useGeoLiveStation() {
  const selectedPlace = useRadarPlaceStore((s) => s.selectedPlace);
  const zoneOverlay = useRadarPlaceStore((s) => s.zoneOverlay);
  const location = useLocationStore((s) => s.currentLocation);

  const [state, setState] = useState<GeoLiveStationState>({
    zoneKey: null,
    overlay: null,
    station: null,
    etas: EMPTY_ETAS,
    loading: false,
    label: null,
  });

  const lastZoneRef = useRef<string | null>(null);

  const fetchStation = useCallback(async (zoneKey: string, label?: string) => {
    if (zoneKey === lastZoneRef.current && state.overlay) return;
    lastZoneRef.current = zoneKey;

    setState(prev => ({ ...prev, loading: true, zoneKey, label: label ?? prev.label }));

    try {
      const overlay = await getZoneOverlay(zoneKey);
      if (overlay) {
        const station = overlayToStation(overlay);
        const etas = projectETAs(station);
        setState({ zoneKey, overlay, station, etas, loading: false, label: label ?? zoneKey });
        // Also update radarPlaceStore if it doesn't have the overlay
        useRadarPlaceStore.getState().setZoneOverlay(overlay);
      } else {
        setState(prev => ({
          ...prev,
          overlay: null,
          station: null,
          etas: EMPTY_ETAS,
          loading: false,
        }));
      }
    } catch (e) {
      console.warn("[useGeoLiveStation] fetch failed:", e);
      setState(prev => ({ ...prev, loading: false }));
    }
  }, [state.overlay]);

  // React to selected place changes
  useEffect(() => {
    if (selectedPlace) {
      // Priority 1: User-selected canonical place
      if (zoneOverlay && zoneOverlay.zone_key === selectedPlace.zone_key) {
        const station = overlayToStation(zoneOverlay);
        const etas = projectETAs(station);
        lastZoneRef.current = selectedPlace.zone_key;
        setState({
          zoneKey: selectedPlace.zone_key,
          overlay: zoneOverlay,
          station,
          etas,
          loading: false,
          label: selectedPlace.label,
        });
      } else {
        fetchStation(selectedPlace.zone_key, selectedPlace.label);
      }
    } else if (location) {
      // Priority 2: GPS-derived zone (locationStore synced from geoStore)
      // Geo Brain will have already set a canonical place via GeoBoot reverse geocode
      // but if not yet resolved, use a computed zone from GPS coordinates
      const locStore = useLocationStore.getState();
      const selected = locStore.selectedLocation;
      if (selected?.city) {
        const zk = computeZoneKey(
          selected.country === "UAE" ? "AE" : selected.country ?? "AE",
          selected.city,
          selected.area
        );
        fetchStation(zk, selected.label || selected.city);
      } else {
        // GPS available but no reverse geocode yet — use default
        fetchStation("AE_DUBAI", "Dubai");
      }
    } else {
      // Priority 3: No place, no GPS — default fallback so UI is never empty
      fetchStation("AE_DUBAI", "Dubai");
    }
  }, [selectedPlace?.zone_key, zoneOverlay?.zone_key, location?.lat]);

  // Listen for refresh events from core event bus
  useEffect(() => {
    const handler = async (payload: Record<string, any>) => {
      const zk = payload.zoneKey || payload.zone_key;
      if (zk) {
        lastZoneRef.current = null; // Force re-fetch
        fetchStation(zk);
      }
    };

    eventBus.on("radar.context.refresh", handler);
    return () => { eventBus.off("radar.context.refresh", handler); };
  }, [fetchStation]);

  return state;
}

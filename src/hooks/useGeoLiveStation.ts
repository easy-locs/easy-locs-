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
      // If radarPlaceStore already has the overlay, use it directly
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
      // Fallback to GPS-derived zone
      const zk = computeZoneKey("AE", "Dubai"); // Will be refined when reverse geocode completes
      fetchStation(zk);
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

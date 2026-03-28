/**
 * GeoBoot — Single GPS lifecycle manager.
 * Requests GPS permission on first visit, syncs to canonical address pipeline.
 * Emits canonical geo events via geo-dispatcher for cross-module propagation.
 */
import { useEffect, useRef } from "react";
import { geoService } from "./geo-service";
import { useGeoStore } from "./geo-store";
import { useLocationStore } from "@/stores/locationStore";
import { reverseGeocode } from "@/lib/location/geocode";
import { fromGPS } from "@/lib/address/canonical-place";
import { setAddressFromPlace } from "@/lib/brain/geo-brain";
import { useRadarPlaceStore } from "@/stores/radarPlaceStore";
import { dispatchUserPosition } from "@/lib/geo/geo-dispatcher";
import { resolveCanonicalGeo } from "@/lib/geo/geo-canonical-resolver";

export function GeoBoot() {
  const lastSyncRef = useRef<string>("");

  useEffect(() => {
    // Start with prompt allowed so user gets the permission dialog
    geoService.start(true);
    return () => geoService.stop();
  }, []);

  // Sync GPS → Geo Brain → reverse geocode → canonical address pipeline
  useEffect(() => {
    const unsub = useGeoStore.subscribe((state) => {
      if (!state.point) return;

      const key = `${state.point.lat.toFixed(4)},${state.point.lng.toFixed(4)}`;
      if (key === lastSyncRef.current) return;
      lastSyncRef.current = key;

      const { lat, lng } = state.point;

      // Dispatch canonical user position to all consumers via geo-dispatcher
      dispatchUserPosition(lat, lng, "gps");

      // Resolve canonical geo for quality tracking
      resolveCanonicalGeo({ lat, lng, source: "gps", precision: "gps" });

      // Update map viewport to user location if no custom viewport set
      const locStore = useLocationStore.getState();
      if (!locStore.mapCenter) {
        locStore.setMapViewport({ lat, lng }, 14);
      }

      // Update city/country on geoStore from reverse geocode
      const updateGeoMeta = (city: string, country: string) => {
        const gs = useGeoStore.getState();
        if (gs.city !== city || gs.country !== country) {
          gs.setStatePartial({ city, country });
        }
      };

      // Skip if user already has a manually selected place (priority: selected > GPS > fallback)
      const hasManualPlace = useRadarPlaceStore.getState().selectedPlace;
      if (hasManualPlace) return;

      // Reverse geocode GPS and push through Geo Brain canonical pipeline
      reverseGeocode(lat, lng)
        .then((result) => {
          const place = fromGPS(lat, lng, {
            label: result.label,
            city: result.city,
            district: result.area,
            country: result.country,
            street: result.street,
          });

          updateGeoMeta(result.city || "", result.country || "");

          // Use Geo Brain as the ONLY write path — this triggers all downstream events
          setAddressFromPlace(place);
        })
        .catch((err) => {
          console.warn("[GeoBoot] reverse geocode failed:", err);
        });
    });

    return unsub;
  }, []);

  return null;
}

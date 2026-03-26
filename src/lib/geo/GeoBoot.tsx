/**
 * GeoBoot — Single GPS lifecycle manager.
 * Requests GPS permission on first visit, syncs to canonical address pipeline.
 */
import { useEffect, useRef } from "react";
import { geoService } from "./geo-service";
import { useGeoStore } from "./geo-store";
import { useLocationStore } from "@/stores/locationStore";
import { reverseGeocode } from "@/lib/location/geocode";
import { fromGPS } from "@/lib/address/canonical-place";
import { eventBus } from "@/lib/core/event-bus";

export function GeoBoot() {
  const lastSyncRef = useRef<string>("");

  useEffect(() => {
    // Start with prompt allowed so user gets the permission dialog
    geoService.start(true);
    return () => geoService.stop();
  }, []);

  // Sync GPS → locationStore → reverse geocode → emit address events
  useEffect(() => {
    const unsub = useGeoStore.subscribe((state) => {
      if (!state.point) return;

      const key = `${state.point.lat.toFixed(4)},${state.point.lng.toFixed(4)}`;
      if (key === lastSyncRef.current) return;
      lastSyncRef.current = key;

      const { lat, lng } = state.point;

      // Update map viewport to user location if no custom viewport set
      const locStore = useLocationStore.getState();
      if (!locStore.mapCenter) {
        locStore.setMapViewport({ lat, lng }, 14);
      }

      // Reverse geocode and emit events
      reverseGeocode(lat, lng)
        .then((result) => {
          const place = fromGPS(lat, lng, {
            label: result.label,
            city: result.city,
            district: result.area,
            country: result.country,
            street: result.street,
          });

          const zoneKey = place.zone_key ?? "UNKNOWN";

          // Emit platform events for all listeners
          eventBus.emit("address.context.updated", {
            userId: "anonymous",
            contextType: "global",
            lat,
            lng,
            sourceType: "gps",
            canonicalPlaceId: null,
            zoneKey,
          });
          eventBus.emit("radar.context.refresh", { userId: "anonymous", zoneKey });
          eventBus.emit("eta.context.refresh", { userId: "anonymous", contextType: "global" });
          eventBus.emit("merchant.visibility.refresh", { zoneKey });
        })
        .catch((err) => {
          console.warn("[GeoBoot] reverse geocode failed:", err);
        });
    });

    return unsub;
  }, []);

  return null;
}

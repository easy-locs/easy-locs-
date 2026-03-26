/**
 * GEO BRAIN — Single source of truth for location, address, and zone.
 * 
 * Owns:
 * - GPS position (via geo-store/geo-service)
 * - Canonical place resolution
 * - Active address context
 * - zone_key computation
 * 
 * No other system may compute location or zone_key.
 * All consumers must read from this brain.
 */
import { useGeoStore, type GeoPoint } from "@/lib/geo/geo-store";
import { useLocationStore } from "@/stores/locationStore";
import { useRadarPlaceStore } from "@/stores/radarPlaceStore";
import { computeZoneKey, type CanonicalPlace } from "@/lib/address/canonical-place";
import { eventBus } from "@/lib/core/event-bus";
import { geoService } from "@/lib/geo/geo-service";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// GEO BRAIN STATE — read-only snapshot
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface GeoBrainState {
  /** Raw GPS point from device */
  gpsPoint: GeoPoint | null;
  /** GPS permission status */
  gpsPermission: "unknown" | "granted" | "denied" | "prompt";
  /** Selected/resolved address (manual or GPS-derived) */
  selectedLocation: {
    lat: number;
    lng: number;
    label: string;
    city?: string;
    area?: string;
    country?: string;
  } | null;
  /** Active zone key for all platform queries */
  zoneKey: string;
  /** Human-readable location label for UI */
  displayLabel: string | null;
  /** Whether location is resolved and usable */
  isResolved: boolean;
}

const DEFAULT_ZONE = "AE_DUBAI";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// READ: Snapshot current geo state
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function getGeoBrainState(): GeoBrainState {
  const geoState = useGeoStore.getState();
  const locState = useLocationStore.getState();
  const radarPlace = useRadarPlaceStore.getState().selectedPlace;

  const selectedLocation = locState.selectedLocation ?? locState.currentLocation ?? null;

  // Zone key priority: radarPlace > computed from location > default
  let zoneKey = DEFAULT_ZONE;
  if (radarPlace?.zone_key) {
    zoneKey = radarPlace.zone_key;
  } else if (selectedLocation?.city) {
    zoneKey = computeZoneKey(
      selectedLocation.country === "UAE" ? "AE" : selectedLocation.country ?? "AE",
      selectedLocation.city,
      selectedLocation.area,
    );
  }

  const displayLabel = radarPlace?.label ?? selectedLocation?.label ?? null;

  return {
    gpsPoint: geoState.point,
    gpsPermission: geoState.permission,
    selectedLocation: selectedLocation
      ? {
          lat: selectedLocation.lat,
          lng: selectedLocation.lng,
          label: selectedLocation.label ?? "",
          city: selectedLocation.city,
          area: selectedLocation.area,
          country: selectedLocation.country,
        }
      : null,
    zoneKey,
    displayLabel,
    isResolved: !!(selectedLocation?.lat && selectedLocation?.lng),
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// WRITE: Update location (only valid entry points)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** Set address from canonical place selection */
export function setAddressFromPlace(place: CanonicalPlace): void {
  if (!place.lat || !place.lng) return;

  const label = place.label ?? place.formatted_address ?? "";
  const zoneKey = place.zone_key ?? computeZoneKey(
    place.country_code ?? "AE",
    place.city ?? undefined,
    place.district ?? undefined,
  );

  // Update all stores atomically
  useLocationStore.getState().setSelectedLocation({
    lat: place.lat, lng: place.lng, label,
    city: place.city ?? undefined,
    area: place.district ?? undefined,
    country: place.country_name ?? undefined,
  });
  useLocationStore.getState().setMapViewport({ lat: place.lat, lng: place.lng }, 14);
  useLocationStore.getState().addRecentPlace({
    lat: place.lat, lng: place.lng, label,
    city: place.city ?? undefined,
    area: place.district ?? undefined,
    country: place.country_name ?? undefined,
  });

  useRadarPlaceStore.getState().setSelectedPlace({
    lat: place.lat, lng: place.lng, label,
    zone_key: zoneKey,
    canonical_place_id: place.id ?? "",
    formatted_address: place.formatted_address ?? label,
    place_type: place.place_type ?? "address",
    viewport: null,
    overlay: null,
  });

  // Emit canonical events → triggers execution brain refresh
  emitLocationChanged(zoneKey);
}

/** Request GPS retry */
export function requestGPS(): void {
  geoService.forceRetry();
}

/** Emit location change events to refresh all downstream brains */
function emitLocationChanged(zoneKey: string): void {
  eventBus.emit("address.context.updated", {
    userId: "anonymous", contextType: "global",
    sourceType: "manual", zoneKey,
  });
  eventBus.emit("radar.context.refresh", { userId: "anonymous", zoneKey });
  eventBus.emit("eta.context.refresh", { userId: "anonymous", contextType: "global" });
  eventBus.emit("merchant.visibility.refresh", { zoneKey });
}

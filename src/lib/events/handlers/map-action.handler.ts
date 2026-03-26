/**
 * Map Action Handler — Consumes map.route.focus, map.center.request,
 * and place.order.requested events emitted by MapPlaceCard actions.
 *
 * Uses radarPlaceStore for map state and window navigation for routing.
 */
import { eventBus } from "@/lib/core/event-bus";
import { useRadarPlaceStore } from "@/stores/radarPlaceStore";
import type { RadarPlaceSelection } from "@/lib/radar/radar-place-search-adapter";

/** Build a minimal RadarPlaceSelection patch from current store + new coords */
function patchSelection(
  lat: number,
  lng: number,
  overrides?: Partial<RadarPlaceSelection>,
): RadarPlaceSelection {
  const current = useRadarPlaceStore.getState().selectedPlace;
  return {
    canonical_place_id: overrides?.canonical_place_id ?? current?.canonical_place_id ?? "",
    label: overrides?.label ?? current?.label ?? "Selected place",
    formatted_address: current?.formatted_address ?? "",
    lat,
    lng,
    zone_key: overrides?.zone_key ?? current?.zone_key,
    place_type: current?.place_type ?? "address",
    viewport: current?.viewport,
    overlay: current?.overlay,
  };
}

// ── map.center.request → update radarPlaceStore so UnifiedMap recenters ──
eventBus.on("map.center.request", (payload) => {
  const { lat, lng } = payload as { lat: number; lng: number; zoom?: number };
  if (!lat || !lng) return;
  useRadarPlaceStore.getState().setSelectedPlace(patchSelection(lat, lng));
});

// ── map.route.focus → update map center to route destination ──
eventBus.on("map.route.focus", (payload) => {
  const { destination, zoneKey } = payload as {
    origin: { lat: number; lng: number };
    destination: { lat: number; lng: number };
    placeId?: string;
    zoneKey?: string;
  };
  if (!destination) return;
  useRadarPlaceStore.getState().setSelectedPlace(
    patchSelection(destination.lat, destination.lng, { zone_key: zoneKey }),
  );
});

// ── place.order.requested → navigate to first merchant's storefront ──
eventBus.on("place.order.requested", (payload) => {
  const { merchants } = payload as {
    placeId: string;
    zoneKey?: string;
    merchants: { id: string; slug: string; name: string; vertical: string }[];
    totalCount: number;
  };

  if (merchants && merchants.length > 0) {
    const top = merchants[0];
    window.location.href = `/s/${top.slug}`;
  }
});

/**
 * Map Action Handler — Consumes map:center_request, map:route_focus,
 * and map:order_requested events emitted by MapPlaceCard actions.
 */
import { platformBus } from "@/lib/shared/platform-bus";
import { useRadarPlaceStore } from "@/stores/radarPlaceStore";
import type { RadarPlaceSelection } from "@/lib/radar/radar-place-search-adapter";

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

platformBus.on("map:center_request", (event) => {
  const { lat, lng } = event.payload as { lat: number; lng: number; zoom?: number };
  if (!lat || !lng) return;
  useRadarPlaceStore.getState().setSelectedPlace(patchSelection(lat, lng));
});

platformBus.on("map:route_focus", (event) => {
  const { destination, zoneKey } = event.payload as {
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

platformBus.on("map:order_requested", (event) => {
  const { merchants } = event.payload as {
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

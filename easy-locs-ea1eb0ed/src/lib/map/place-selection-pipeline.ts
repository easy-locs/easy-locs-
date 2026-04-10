/**
 * Place Selection Pipeline — Orchestrates the full post-selection chain:
 * place.selected → route preview → nearby fetch → event propagation
 * 
 * Called after any place-discovery selection on the map.
 */
import { eventBus } from "@/lib/core/event-bus";
import { computeRoutePreview, type RoutePreview } from "./route-preview-engine";
import { fetchNearbyMerchants, type NearbyResult } from "./nearby-discovery-engine";
import { getGeoBrainState } from "@/lib/brain/geo-brain";

export interface PlaceSelectionResult {
  route: RoutePreview | null;
  nearby: NearbyResult | null;
}

export async function runPlaceSelectionPipeline(place: {
  id: string;
  lat: number;
  lng: number;
  zone_key?: string;
  label?: string;
}): Promise<PlaceSelectionResult> {
  // 1. Emit place.selected
  eventBus.emit("place.selected", {
    placeId: place.id,
    lat: place.lat,
    lng: place.lng,
    zoneKey: place.zone_key,
    label: place.label,
  });

  // 2. Get user origin from Geo Brain
  const geo = getGeoBrainState();
  const origin = geo.selectedLocation
    ? { lat: geo.selectedLocation.lat, lng: geo.selectedLocation.lng }
    : geo.gpsPoint
      ? { lat: geo.gpsPoint.lat, lng: geo.gpsPoint.lng }
      : null;

  // 3. Run route preview + nearby fetch in parallel
  const [route, nearby] = await Promise.all([
    origin
      ? computeRoutePreview(origin, { lat: place.lat, lng: place.lng }, place.id, place.zone_key)
      : Promise.resolve(null),
    fetchNearbyMerchants(place),
  ]);

  // 4. Propagate downstream events
  if (place.zone_key) {
    eventBus.emit("eta.context.refresh", { zoneKey: place.zone_key });
    eventBus.emit("merchant.visibility.refresh", { zoneKey: place.zone_key });
  }

  return { route, nearby };
}

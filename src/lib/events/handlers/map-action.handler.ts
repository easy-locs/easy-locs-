/**
 * Map Action Handler — Consumes map.route.focus, map.center.request,
 * and place.order.requested events emitted by MapPlaceCard actions.
 *
 * Uses radarPlaceStore for map state and window navigation for routing.
 */
import { eventBus } from "@/lib/core/event-bus";
import { useRadarPlaceStore } from "@/stores/radarPlaceStore";

// ── map.center.request → update radarPlaceStore so UnifiedMap recenters ──
eventBus.on("map.center.request", (payload) => {
  const { lat, lng } = payload as { lat: number; lng: number; zoom?: number };
  if (!lat || !lng) return;

  const store = useRadarPlaceStore.getState();
  store.setSelectedPlace({
    lat,
    lng,
    label: store.selectedPlace?.label ?? "Selected place",
    zone_key: store.selectedPlace?.zone_key,
    overlay: store.selectedPlace?.overlay,
  });
});

// ── map.route.focus → update map center to route midpoint ──
eventBus.on("map.route.focus", (payload) => {
  const { destination } = payload as {
    origin: { lat: number; lng: number };
    destination: { lat: number; lng: number };
    placeId?: string;
    zoneKey?: string;
  };
  if (!destination) return;

  const store = useRadarPlaceStore.getState();
  store.setSelectedPlace({
    lat: destination.lat,
    lng: destination.lng,
    label: store.selectedPlace?.label ?? "Route destination",
    zone_key: payload.zoneKey ?? store.selectedPlace?.zone_key,
    overlay: store.selectedPlace?.overlay,
  });
});

// ── place.order.requested → navigate to first merchant or zone commerce view ──
eventBus.on("place.order.requested", (payload) => {
  const { merchants, zoneKey } = payload as {
    placeId: string;
    zoneKey?: string;
    merchants: { id: string; slug: string; name: string; vertical: string }[];
    totalCount: number;
  };

  if (merchants && merchants.length > 0) {
    // Navigate to first merchant's storefront as primary action
    const top = merchants[0];
    window.location.href = `/s/${top.slug}`;
  }
});

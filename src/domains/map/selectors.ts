/**
 * Map Selectors — Read-only projections from unified mapStore.
 */
import { useUnifiedMapStore } from "@/stores/mapStore";

export function selectVisiblePins() {
  const { entities, selectedEntityId } = useUnifiedMapStore.getState();
  return entities.map((e) => ({
    ...e,
    selected: e.id === selectedEntityId,
  }));
}

export function selectMapViewport() {
  const { viewport } = useUnifiedMapStore.getState();
  return { centerLat: viewport.centerLat, centerLng: viewport.centerLng, zoom: viewport.zoom };
}

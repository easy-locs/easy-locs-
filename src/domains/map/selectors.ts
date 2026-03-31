/**
 * Map Selectors — Read-only projections from superMapStore.
 */
import { useSuperMapStore } from "@/stores/superMapStore";

export function selectVisiblePins() {
  const { entities, selectedEntityId } = useSuperMapStore.getState();
  return entities.map((e) => ({
    ...e,
    selected: e.id === selectedEntityId,
  }));
}

export function selectMapViewport() {
  const { centerLat, centerLng, zoom } = useSuperMapStore.getState();
  return { centerLat, centerLng, zoom };
}

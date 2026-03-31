/**
 * Radar Selectors — Read-only projections from radarStore.
 */
import { useRadarStore } from "@/stores/radarStore";

export function selectRadarFeed() {
  return useRadarStore.getState().filtered;
}

export function selectRadarCategory() {
  const { category, subcategory } = useRadarStore.getState();
  return { category, subcategory };
}

/**
 * useMapPreset — Resolves the active map preset from SuperMap mode and applies it.
 */
import { useMemo } from "react";
import { useSuperMapStore } from "@/stores/superMapStore";
import { MAP_PRESETS, type MapScreenPreset } from "@/lib/map/presets/map-screen-presets";
import type { SuperMapMode } from "@/lib/map/superMapLayers";

const MODE_TO_PRESET: Record<SuperMapMode, string> = {
  explore: "default",
  radar: "radar",
  mobility: "delivery",
  food: "storefront",
  retail: "storefront",
  stay: "travel",
  property: "default",
  services: "default",
  wallet: "default",
};

export function useMapPreset(): MapScreenPreset {
  const mode = useSuperMapStore(s => s.mode);
  const showHeatmap = useSuperMapStore(s => s.showHeatmap);
  const showWeather = useSuperMapStore(s => s.showWeather);

  return useMemo(() => {
    // Pick base preset
    const presetId = MODE_TO_PRESET[mode] || "default";
    const base = MAP_PRESETS[presetId] || MAP_PRESETS.default;

    // Override with user toggles
    return {
      ...base,
      layers: {
        ...base.layers,
        heatmap: showHeatmap || base.layers.heatmap,
        weather: showWeather || base.layers.weather,
      },
    };
  }, [mode, showHeatmap, showWeather]);
}

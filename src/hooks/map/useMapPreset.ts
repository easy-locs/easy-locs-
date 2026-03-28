/**
 * useMapPreset — Resolves the active map preset from SuperMap mode.
 * Weather display is governed by weatherDisplayStore, not here.
 */
import { useMemo } from "react";
import { useSuperMapStore } from "@/stores/superMapStore";
import { useWeatherDisplayStore } from "@/stores/weatherDisplayStore";
import { MAP_PRESETS, type MapScreenPreset } from "@/lib/map/presets/map-screen-presets";
import type { SuperMapMode } from "@/lib/map/superMapLayers";

const MODE_TO_PRESET: Record<SuperMapMode, string> = {
  explore: "default",
  radar: "radar",
  mobility: "delivery",
  food: "food",
  retail: "retail",
  stay: "travel",
  property: "property",
  services: "services",
  wallet: "default",
};

export function useMapPreset(): MapScreenPreset {
  const mode = useSuperMapStore(s => s.mode);
  const showHeatmap = useSuperMapStore(s => s.showHeatmap);
  const radarOverlay = useWeatherDisplayStore(s => s.radarOverlay);

  return useMemo(() => {
    const presetId = MODE_TO_PRESET[mode] || "default";
    const base = MAP_PRESETS[presetId] || MAP_PRESETS.default;

    return {
      ...base,
      layers: {
        ...base.layers,
        heatmap: showHeatmap || base.layers.heatmap,
        radarOverlay: radarOverlay !== "off" || base.layers.radarOverlay,
      },
    };
  }, [mode, showHeatmap, radarOverlay]);
}

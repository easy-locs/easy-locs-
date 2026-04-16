import type maplibregl from "maplibre-gl";
import type { MapStylePreset, MapDensityMode } from "./types";

const STYLE_URLS: Record<MapStylePreset, string> = {
  dark: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
  light: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
  satellite: "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json",
  premium: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
};

let currentPreset: MapStylePreset = "dark";
let currentDensity: MapDensityMode = "medium";

export function getStyleUrl(preset: MapStylePreset): string {
  return STYLE_URLS[preset] || STYLE_URLS.dark;
}

export function getCurrentPreset(): MapStylePreset {
  return currentPreset;
}

export function setPreset(preset: MapStylePreset) {
  currentPreset = preset;
}

export function getDensity(): MapDensityMode {
  return currentDensity;
}

export function setDensity(density: MapDensityMode) {
  currentDensity = density;
}

export function getClusterRadius(): number {
  switch (currentDensity) {
    case "low": return 80;
    case "medium": return 55;
    case "high": return 35;
  }
}

export function getAutoPreset(): MapStylePreset {
  const hour = new Date().getHours();
  return hour >= 6 && hour < 19 ? "light" : "dark";
}

export function applyPremiumFog(map: maplibregl.Map) {
  try {
    (map as any).setFog?.({
      color: "hsl(220, 20%, 10%)",
      "high-color": "hsl(220, 30%, 18%)",
      "horizon-blend": 0.08,
      "space-color": "hsl(220, 30%, 5%)",
      "star-intensity": 0.15,
    });
  } catch {}
}

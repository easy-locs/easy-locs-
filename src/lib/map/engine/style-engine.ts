/**
 * StyleEngine — Injectable map style management.
 * Handles day/night, premium, density, event modes.
 */
import type mapboxgl from "mapbox-gl";
import type { MapStylePreset, MapDensityMode } from "./types";

const STYLE_URLS: Record<MapStylePreset, string> = {
  dark: "mapbox://styles/mapbox/dark-v11",
  light: "mapbox://styles/mapbox/light-v11",
  satellite: "mapbox://styles/mapbox/satellite-streets-v12",
  premium: "mapbox://styles/mapbox/dark-v11", // custom overlay on dark
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

/** Cluster radius based on density */
export function getClusterRadius(): number {
  switch (currentDensity) {
    case "low": return 80;
    case "medium": return 55;
    case "high": return 35;
  }
}

/** Auto-detect day/night based on local time */
export function getAutoPreset(): MapStylePreset {
  const hour = new Date().getHours();
  return hour >= 6 && hour < 19 ? "light" : "dark";
}

/** Apply fog for premium depth effect */
export function applyPremiumFog(map: mapboxgl.Map) {
  try {
    map.setFog({
      color: "hsl(220, 20%, 10%)",
      "high-color": "hsl(220, 30%, 18%)",
      "horizon-blend": 0.08,
      "space-color": "hsl(220, 30%, 5%)",
      "star-intensity": 0.15,
    } as any);
  } catch {}
}

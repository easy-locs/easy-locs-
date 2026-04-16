import type maplibreglType from "maplibre-gl";

type MapLibreGL = typeof maplibreglType;

let cached: MapLibreGL | null = null;
let loadPromise: Promise<MapLibreGL> | null = null;
let cssLoaded = false;

export function loadMapLibre(): Promise<MapLibreGL> {
  if (cached) return Promise.resolve(cached);
  if (!loadPromise) {
    loadPromise = import("maplibre-gl").then((m) => {
      cached = m.default as unknown as MapLibreGL;
      if (!cssLoaded) {
        cssLoaded = true;
        import("maplibre-gl/dist/maplibre-gl.css");
      }
      return cached;
    }).catch((err) => {
      loadPromise = null;
      throw err;
    });
  }
  return loadPromise;
}

export function preloadMapLibre(): void {
  loadMapLibre().catch(() => {});
}

export function getMapLibreGL(): MapLibreGL | null {
  return cached;
}

export const loadMapbox = loadMapLibre;
export const preloadMapbox = preloadMapLibre;
export const getMapboxgl = getMapLibreGL;

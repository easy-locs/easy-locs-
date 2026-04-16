import type maplibreglType from "maplibre-gl";

type MapLibreGL = typeof maplibreglType;

let cached: MapLibreGL | null = null;
let loadPromise: Promise<MapLibreGL> | null = null;
let cssLoaded = false;

export function loadMapbox(): Promise<MapLibreGL> {
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

export function preloadMapbox(): void {
  loadMapbox().catch(() => {});
}

export function getMapboxgl(): MapLibreGL | null {
  return cached;
}

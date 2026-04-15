import type mapboxglType from "mapbox-gl";

type MapboxGL = typeof mapboxglType;

let cached: MapboxGL | null = null;
let loadPromise: Promise<MapboxGL> | null = null;
let cssLoaded = false;

export function loadMapbox(): Promise<MapboxGL> {
  if (cached) return Promise.resolve(cached);
  if (!loadPromise) {
    loadPromise = import("mapbox-gl").then((m) => {
      cached = m.default as unknown as MapboxGL;
      if (!cssLoaded) {
        cssLoaded = true;
        import("mapbox-gl/dist/mapbox-gl.css");
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

export function getMapboxgl(): MapboxGL | null {
  return cached;
}

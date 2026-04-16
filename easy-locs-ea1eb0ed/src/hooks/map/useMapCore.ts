import { useCallback, useEffect, useRef, useState } from "react";
import type maplibregl from "maplibre-gl";
import { loadMapbox, getMapboxgl } from "@/lib/mapbox/mapbox-loader";
import { getMapTokenError } from "@/lib/mapbox/config";
import { applyPremiumFog } from "@/lib/map/engine/style-engine";
import { trackMapError } from "@/lib/analytics/map-error-analytics";

const DEFAULT_STYLE = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

let mapInstance: maplibregl.Map | null = null;

export function getMapInstance(): maplibregl.Map | null {
  return mapInstance;
}

export function setMapInstance(map: maplibregl.Map | null) {
  mapInstance = map;
}

interface UseMapCoreOptions {
  centerLng: number;
  centerLat: number;
  zoom: number;
  style?: string;
  onReady?: (map: maplibregl.Map) => void;
}

export function useMapCore(
  containerRef: React.RefObject<HTMLDivElement | null>,
  options: UseMapCoreOptions
) {
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const cancelledRef = useRef(false);

  const cleanup = useCallback(() => {
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
      setMapInstance(null);
      (globalThis as Record<string, unknown>).__superMapInstance = null;
      setReady(false);
    }
  }, []);

  const initMap = useCallback(() => {
    if (!containerRef.current) return;

    cleanup();
    cancelledRef.current = false;

    const tokenError = getMapTokenError();
    if (tokenError) {
      trackMapError({ component: "useMapCore", errorMessage: tokenError, errorType: "webgl", lat: options.centerLat, lng: options.centerLng, zoom: options.zoom });
      setError(tokenError);
      setIsRetrying(false);
      return;
    }

    setError(null);

    try {
      const testCanvas = document.createElement("canvas");
      const gl = testCanvas.getContext("webgl") || testCanvas.getContext("experimental-webgl");
      if (!gl) {
        const msg = "3D rendering (WebGL) is not supported in this browser.";
        trackMapError({ component: "useMapCore", errorMessage: msg, errorType: "webgl", lat: options.centerLat, lng: options.centerLng, zoom: options.zoom });
        setError(msg);
        setIsRetrying(false);
        return;
      }
    } catch {
      const msg = "3D rendering is not supported in this browser.";
      trackMapError({ component: "useMapCore", errorMessage: msg, errorType: "webgl", lat: options.centerLat, lng: options.centerLng, zoom: options.zoom });
      setError(msg);
      setIsRetrying(false);
      return;
    }

    loadMapbox().then((maplibregl) => {
      if (cancelledRef.current || !containerRef.current) return;

      try {
        const map = new maplibregl.Map({
          container: containerRef.current,
          style: options.style || DEFAULT_STYLE,
          center: [options.centerLng, options.centerLat],
          zoom: options.zoom,
          attributionControl: false,
          maxZoom: 18,
        });

        mapRef.current = map;
        setMapInstance(map);
        (globalThis as Record<string, unknown>).__superMapInstance = map;

        map.on("error", (e: any) => {
          const msg = e.error?.message || e.message || String(e.error ?? "");
          if (msg) {
            const msgLower = msg.toLowerCase();
            if (msgLower.includes("webgl") || msgLower.includes("context")) {
              console.warn("[useMapCore] Runtime map error:", msg);
              trackMapError({ component: "useMapCore", errorMessage: msg || "Map unavailable", errorType: "webgl", lat: options.centerLat, lng: options.centerLng, zoom: options.zoom });
              setError(msg || "Map unavailable");
              setIsRetrying(false);
            } else {
              trackMapError({ component: "useMapCore", errorMessage: msg, lat: options.centerLat, lng: options.centerLng, zoom: options.zoom });
            }
          }
        });

        map.on("load", () => {
          if (cancelledRef.current) return;
          applyPremiumFog(map);
          setReady(true);
          setIsRetrying(false);
          options.onReady?.(map);
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Map initialization failed";
        console.warn("[useMapCore] Map init failed:", msg);
        trackMapError({ component: "useMapCore", errorMessage: msg, errorType: "init_failure", lat: options.centerLat, lng: options.centerLng, zoom: options.zoom });
        setError(msg);
        setIsRetrying(false);
      }
    }).catch((err: unknown) => {
      if (!cancelledRef.current) {
        const msg = err instanceof Error ? err.message : "Failed to load map library";
        console.warn("[useMapCore] Failed to load MapLibre GL:", msg);
        trackMapError({ component: "useMapCore", errorMessage: msg || "Failed to load map library", errorType: "network", lat: options.centerLat, lng: options.centerLng, zoom: options.zoom });
        setError(msg || "Failed to load map library");
        setIsRetrying(false);
      }
    });
  }, [containerRef, options.centerLng, options.centerLat, options.zoom, options.style, options.onReady, cleanup]);

  useEffect(() => {
    initMap();

    return () => {
      cancelledRef.current = true;
      cleanup();
    };
  }, [retryCount]);

  const retry = useCallback(() => {
    setIsRetrying(true);
    setRetryCount((c) => c + 1);
  }, []);

  const easeTo = (lng: number, lat: number, z?: number) => {
    mapRef.current?.easeTo({
      center: [lng, lat],
      zoom: z ?? mapRef.current.getZoom(),
      duration: 450,
    });
  };

  const fitBounds = (coords: [number, number][], padding = 60) => {
    if (!mapRef.current || coords.length === 0) return;
    const gl = getMapboxgl();
    if (!gl) return;
    const bounds = new gl.LngLatBounds();
    coords.forEach(c => bounds.extend(c));
    mapRef.current.fitBounds(bounds, { padding, maxZoom: 15, duration: 400 });
  };

  return { mapRef, ready, error, isRetrying, retry, easeTo, fitBounds };
}

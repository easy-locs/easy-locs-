import { useCallback, useEffect, useRef, useState } from "react";
import type mapboxgl from "mapbox-gl";
import { loadMapbox, getMapboxgl } from "@/lib/mapbox/mapbox-loader";
import { MAPBOX_ACCESS_TOKEN, getMapboxTokenError } from "@/lib/mapbox/config";
import { applyPremiumFog } from "@/lib/map/engine/style-engine";
import { trackMapError } from "@/lib/analytics/map-error-analytics";

let mapInstance: mapboxgl.Map | null = null;

export function getMapInstance(): mapboxgl.Map | null {
  return mapInstance;
}

export function setMapInstance(map: mapboxgl.Map | null) {
  mapInstance = map;
}

interface UseMapCoreOptions {
  centerLng: number;
  centerLat: number;
  zoom: number;
  style?: string;
  onReady?: (map: mapboxgl.Map) => void;
}

export function useMapCore(
  containerRef: React.RefObject<HTMLDivElement | null>,
  options: UseMapCoreOptions
) {
  const mapRef = useRef<mapboxgl.Map | null>(null);
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

    const tokenError = getMapboxTokenError();
    if (tokenError) {
      trackMapError({ component: "useMapCore", errorMessage: tokenError, errorType: "token", lat: options.centerLat, lng: options.centerLng, zoom: options.zoom });
      setError(tokenError);
      setIsRetrying(false);
      return;
    }

    setError(null);

    if (!MAPBOX_ACCESS_TOKEN?.trim()) {
      const msg = "Mapbox access token is not configured. Please set the VITE_MAPBOX_TOKEN environment variable.";
      trackMapError({ component: "useMapCore", errorMessage: msg, errorType: "token", lat: options.centerLat, lng: options.centerLng, zoom: options.zoom });
      setError(msg);
      setIsRetrying(false);
      return;
    }

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

    loadMapbox().then((mapboxgl) => {
      if (cancelledRef.current || !containerRef.current) return;
      mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;

      try {
        const map = new mapboxgl.Map({
          container: containerRef.current,
          style: options.style || "mapbox://styles/mapbox/dark-v11",
          center: [options.centerLng, options.centerLat],
          zoom: options.zoom,
          attributionControl: false,
          maxZoom: 18,
        });

        mapRef.current = map;
        setMapInstance(map);
        (globalThis as Record<string, unknown>).__superMapInstance = map;

        map.on("error", (e: mapboxgl.ErrorEvent & { error?: { message?: string; status?: number } }) => {
          const msg = e.error?.message || String(e.error ?? "");
          const msgLower = msg.toLowerCase();
          if (
            msgLower.includes("access token") ||
            msgLower.includes("unauthorized") ||
            msgLower.includes("401") ||
            msgLower.includes("403") ||
            msgLower.includes("not authorized")
          ) {
            console.warn("[useMapCore] Mapbox auth error:", msg);
            const errorMsg = "Mapbox access token is invalid or expired. Please check your VITE_MAPBOX_TOKEN.";
            trackMapError({ component: "useMapCore", errorMessage: errorMsg, errorType: "token", lat: options.centerLat, lng: options.centerLng, zoom: options.zoom });
            setError(errorMsg);
            setIsRetrying(false);
            return;
          }
          if (msgLower.includes("webgl") || msgLower.includes("context")) {
            console.warn("[useMapCore] Runtime map error:", msg);
            trackMapError({ component: "useMapCore", errorMessage: msg || "Map unavailable", errorType: "webgl", lat: options.centerLat, lng: options.centerLng, zoom: options.zoom });
            setError(msg || "Map unavailable");
            setIsRetrying(false);
          } else if (msg) {
            trackMapError({ component: "useMapCore", errorMessage: msg, lat: options.centerLat, lng: options.centerLng, zoom: options.zoom });
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
        console.warn("[useMapCore] Failed to load Mapbox GL:", msg);
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

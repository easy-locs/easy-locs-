import { useEffect, useRef, useState } from "react";
import type mapboxgl from "mapbox-gl";
import { loadMapbox, getMapboxgl } from "@/lib/mapbox/mapbox-loader";
import { MAPBOX_ACCESS_TOKEN } from "@/lib/mapbox/config";
import { applyPremiumFog } from "@/lib/map/engine/style-engine";

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

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let cancelled = false;
    setError(null);

    if (!MAPBOX_ACCESS_TOKEN?.trim()) {
      setError("Mapbox access token is not configured. Please set the VITE_MAPBOX_TOKEN environment variable.");
      return;
    }

    try {
      const testCanvas = document.createElement("canvas");
      const gl = testCanvas.getContext("webgl") || testCanvas.getContext("experimental-webgl");
      if (!gl) {
        setError("3D rendering (WebGL) is not supported in this browser.");
        return;
      }
    } catch {
      setError("3D rendering is not supported in this browser.");
      return;
    }

    loadMapbox().then((mapboxgl) => {
      if (cancelled || !containerRef.current) return;
      mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;

      let map: mapboxgl.Map;
      try {
        map = new mapboxgl.Map({
          container: containerRef.current,
          style: options.style || "mapbox://styles/mapbox/dark-v11",
          center: [options.centerLng, options.centerLat],
          zoom: options.zoom,
          attributionControl: false,
          maxZoom: 18,
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Map initialization failed";
        console.warn("[useMapCore] Map init failed:", msg);
        setError(msg);
        return;
      }

      mapRef.current = map;
      (globalThis as Record<string, unknown>).__superMapInstance = map;

      map.on("error", (e) => {
        const msg = (e.error?.message as string) ?? "";
        const msgLower = msg.toLowerCase();
        if (
          msgLower.includes("access token") ||
          msgLower.includes("unauthorized") ||
          msgLower.includes("401") ||
          msgLower.includes("not authorized")
        ) {
          console.warn("[useMapCore] Mapbox auth error:", msg);
          setError("Mapbox access token is invalid or expired. Please check your VITE_MAPBOX_TOKEN.");
          return;
        }
        if (msgLower.includes("webgl") || msgLower.includes("context")) {
          console.warn("[useMapCore] Runtime map error:", msg);
          setError(msg || "Map unavailable");
        }
      });

      map.on("load", () => {
        if (cancelled) return;
        applyPremiumFog(map);
        setReady(true);
        options.onReady?.(map);
      });
    }).catch((err: unknown) => {
      if (!cancelled) {
        const msg = err instanceof Error ? err.message : "Failed to load map library";
        console.warn("[useMapCore] Failed to load Mapbox GL:", msg);
        setError("Failed to load map library");
      }
    });

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        (globalThis as Record<string, unknown>).__superMapInstance = null;
        setReady(false);
      }
    };
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

  return { mapRef, ready, error, easeTo, fitBounds };
}

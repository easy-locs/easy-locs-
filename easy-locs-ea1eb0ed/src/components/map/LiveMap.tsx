import { useCallback, useEffect, useRef, useState } from "react";
import type mapboxgl from "mapbox-gl";
import { loadMapbox, getMapboxgl } from "@/lib/mapbox/mapbox-loader";
import { MAPBOX_ACCESS_TOKEN, getMapboxTokenError } from "@/lib/mapbox/config";
import MapErrorFallback from "@/components/map/MapErrorFallback";
import { MapErrorBoundary } from "@/components/map/MapErrorBoundary";
import { useNetworkRecovery } from "@/hooks/map/useNetworkRecovery";
import { MapPin } from "lucide-react";
import { trackMapError } from "@/lib/analytics/map-error-analytics";

interface MapPoint {
  lat: number;
  lng: number;
  label?: string;
}

interface LiveMapProps {
  points: MapPoint[];
  center?: [number, number];
  zoom?: number;
  className?: string;
  showRoute?: boolean;
}

export default function LiveMap({
  points,
  center = [25.2048, 55.2708],
  zoom = 13,
  className = "",
  showRoute = true,
}: LiveMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const cancelledRef = useRef(false);

  const cleanupMap = useCallback(() => {
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }
    markersRef.current = [];
    setMapReady(false);
  }, []);

  const retry = useCallback(() => {
    setIsRetrying(true);
    setRetryCount((c) => c + 1);
  }, []);

  const { isOffline } = useNetworkRecovery({
    enabled: !!mapError,
    onReconnect: retry,
  });

  useEffect(() => {
    if (!containerRef.current) return;

    cleanupMap();
    cancelledRef.current = false;

    const tokenError = getMapboxTokenError();
    if (tokenError) {
      trackMapError({ component: "LiveMap", errorMessage: tokenError, errorType: "token", lat: center[0], lng: center[1], zoom });
      setMapError(tokenError);
      setIsRetrying(false);
      return;
    }

    setMapError(null);

    if (!MAPBOX_ACCESS_TOKEN?.trim()) {
      const msg = "Mapbox access token is not configured.";
      trackMapError({ component: "LiveMap", errorMessage: msg, errorType: "token", lat: center[0], lng: center[1], zoom });
      setMapError(msg);
      setIsRetrying(false);
      return;
    }

    loadMapbox().then((mapboxgl) => {
      if (cancelledRef.current || !containerRef.current) return;
      mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;

      try {
        const map = new mapboxgl.Map({
          container: containerRef.current,
          style: "mapbox://styles/mapbox/dark-v11",
          center: [center[1], center[0]],
          zoom,
          attributionControl: false,
        });

        mapRef.current = map;

        map.on("error", (e: mapboxgl.ErrorEvent & { error?: { message?: string } }) => {
          const rawMsg = e.error?.message || String(e.error ?? "");
          const msg = rawMsg.toLowerCase();
          if (msg.includes("401") || msg.includes("403") || msg.includes("access token") || msg.includes("unauthorized")) {
            const errorMsg = "Mapbox access token is invalid or expired.";
            trackMapError({ component: "LiveMap", errorMessage: errorMsg, errorType: "token", lat: center[0], lng: center[1], zoom });
            setMapError(errorMsg);
            setIsRetrying(false);
          } else if (rawMsg) {
            trackMapError({ component: "LiveMap", errorMessage: rawMsg, lat: center[0], lng: center[1], zoom });
          }
        });

        map.on("load", () => {
          if (!cancelledRef.current) {
            setMapReady(true);
            setIsRetrying(false);
          }
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Map initialization failed";
        trackMapError({ component: "LiveMap", errorMessage: msg, errorType: "init_failure", lat: center[0], lng: center[1], zoom });
        setMapError(msg);
        setIsRetrying(false);
      }
    }).catch((err: unknown) => {
      if (!cancelledRef.current) {
        const msg = err instanceof Error ? err.message : "Failed to load map";
        trackMapError({ component: "LiveMap", errorMessage: msg, errorType: "network", lat: center[0], lng: center[1], zoom });
        setMapError(msg);
        setIsRetrying(false);
      }
    });

    return () => {
      cancelledRef.current = true;
      cleanupMap();
    };
  }, [retryCount]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !points.length) return;
    const gl = getMapboxgl();
    if (!gl) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    points.forEach((p, i) => {
      const isFirst = i === 0;
      const isLast = i === points.length - 1;
      const color = isFirst ? "#3b82f6" : isLast ? "#ef4444" : "#6b7280";
      const size = isFirst || isLast ? 14 : 8;

      const el = document.createElement("div");
      el.style.cssText = `width:${size}px;height:${size}px;border-radius:50%;background:${color};border:2px solid rgba(255,255,255,0.6);box-shadow:0 2px 6px rgba(0,0,0,0.3);cursor:pointer;`;

      const marker = new gl.Marker(el)
        .setLngLat([p.lng, p.lat])
        .setPopup(new gl.Popup({ offset: 12, closeButton: false }).setText(p.label || `Point ${i + 1}`))
        .addTo(map);

      markersRef.current.push(marker);
    });

    if (showRoute && points.length > 1 && map.isStyleLoaded()) {
      const sourceId = "live-route";
      const routeData: GeoJSON.Feature = {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: points.map((p) => [p.lng, p.lat]),
        },
      };

      if (map.getSource(sourceId)) {
        (map.getSource(sourceId) as mapboxgl.GeoJSONSource).setData(routeData);
      } else {
        map.addSource(sourceId, { type: "geojson", data: routeData });
        if (!map.getLayer("live-route-line")) {
          map.addLayer({
            id: "live-route-line",
            type: "line",
            source: sourceId,
            paint: {
              "line-color": "#3b82f6",
              "line-width": 3,
              "line-opacity": 0.7,
            },
          });
        }
      }
    }

    const bounds = new gl.LngLatBounds();
    points.forEach((p) => bounds.extend([p.lng, p.lat]));
    map.fitBounds(bounds, { padding: 40, maxZoom: 15 });
  }, [points, showRoute, mapReady]);

  if (mapError) {
    return (
      <div className={`relative w-full h-[400px] ${className}`}>
        <div
          ref={containerRef}
          className="absolute inset-0 rounded-xl overflow-hidden border border-border"
          style={{ visibility: "hidden" }}
        />
        <MapErrorFallback
          message={mapError}
          className="absolute inset-0"
          onRetry={retry}
          isOffline={isOffline}
          isRetrying={isRetrying}
        />
      </div>
    );
  }

  return (
    <MapErrorBoundary fallbackHeight={400}>
      <div
        ref={containerRef}
        className={`w-full h-[400px] rounded-xl overflow-hidden border border-border ${className}`}
      />
    </MapErrorBoundary>
  );
}

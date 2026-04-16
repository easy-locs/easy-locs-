import { useCallback, useEffect, useRef, useState } from "react";
import type maplibregl from "maplibre-gl";
import { loadMapLibre, getMapLibreGL } from "@/lib/maplibre/maplibre-loader";
import { getMapTokenError, getMapStyleUrl, isWebGLSupported } from "@/lib/maplibre/config";
import MapErrorFallback from "@/components/map/MapErrorFallback";
import { MapErrorBoundary } from "@/components/map/MapErrorBoundary";
import LeafletFallbackMap from "@/components/map/LeafletFallbackMap";
import { useNetworkRecovery } from "@/hooks/map/useNetworkRecovery";
import { useMapRetry } from "@/hooks/map/useMapRetry";
import { useMapErrorHandler } from "@/hooks/useMapErrorHandler";
import { Navigation } from "lucide-react";

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
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const [mapReady, setMapReady] = useState(false);
  const [useFallback, setUseFallback] = useState(false);
  const { mapError, handleMapError, clearMapError } = useMapErrorHandler("LiveMap");
  const retry = useMapRetry();
  const cancelledRef = useRef(false);

  const cleanupMap = useCallback(() => {
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }
    markersRef.current = [];
    setMapReady(false);
  }, []);

  const handleRetry = useCallback(() => {
    clearMapError();
    retry.triggerRetry();
  }, [clearMapError, retry]);

  const { isOffline } = useNetworkRecovery({
    enabled: !!mapError,
    onReconnect: handleRetry,
  });

  useEffect(() => {
    if (!containerRef.current) return;

    cleanupMap();
    cancelledRef.current = false;
    clearMapError();
    setUseFallback(false);

    if (!isWebGLSupported()) {
      setUseFallback(true);
      return;
    }

    const tokenError = getMapTokenError();
    if (tokenError) {
      handleMapError(tokenError, { lat: center[0], lng: center[1], zoom });
      return;
    }

    loadMapLibre().then((maplibregl) => {
      if (cancelledRef.current || !containerRef.current) return;

      try {
        const map = new maplibregl.Map({
          container: containerRef.current,
          style: getMapStyleUrl("dark"),
          center: [center[1], center[0]],
          zoom,
          attributionControl: false,
        });

        mapRef.current = map;

        map.on("error", (e: maplibregl.ErrorEvent & { error?: { message?: string } }) => {
          const rawMsg = e.error?.message || String(e.error ?? "");
          const msg = rawMsg.toLowerCase();
          if (msg.includes("401") || msg.includes("403") || msg.includes("access token") || msg.includes("unauthorized")) {
            handleMapError("Map access token is invalid or expired.", { lat: center[0], lng: center[1], zoom });
          } else if (rawMsg) {
            handleMapError(rawMsg, { lat: center[0], lng: center[1], zoom });
          }
        });

        map.on("load", () => {
          if (!cancelledRef.current) {
            setMapReady(true);
          }
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Map initialization failed";
        handleMapError(msg, { errorType: "init_failure", lat: center[0], lng: center[1], zoom });
      }
    }).catch((err: unknown) => {
      if (!cancelledRef.current) {
        const msg = err instanceof Error ? err.message : "Failed to load map";
        handleMapError(msg, { errorType: "network", lat: center[0], lng: center[1], zoom });
      }
    });

    return () => {
      cancelledRef.current = true;
      cleanupMap();
    };
  }, [retry.retryKey]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !points.length) return;
    const gl = getMapLibreGL();
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
        (map.getSource(sourceId) as maplibregl.GeoJSONSource).setData(routeData);
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

  if (useFallback) {
    return (
      <LeafletFallbackMap
        entities={points.map((p, i) => ({
          id: `live-${i}`,
          lat: p.lat,
          lng: p.lng,
          name: p.label ?? `Point ${i + 1}`,
          title: p.label,
          type: "service" as const,
        }))}
        userLat={center[0]}
        userLng={center[1]}
        showUserLocation={false}
        className={`rounded-xl overflow-hidden border border-border ${className}`}
      />
    );
  }

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
          title="Live map unavailable"
          icon={Navigation}
          className="absolute inset-0"
          onRetry={handleRetry}
          isOffline={isOffline}
          isOnCooldown={retry.isOnCooldown}
          cooldownRemaining={retry.cooldownRemaining}
          retryCount={retry.retryCount}
          maxRetries={retry.maxRetries}
          exhausted={retry.exhausted}
        />
      </div>
    );
  }

  return (
    <MapErrorBoundary fallbackHeight={400} fallbackTitle="Live map unavailable" fallbackIcon={Navigation}>
      <div
        ref={containerRef}
        className={`w-full h-[400px] rounded-xl overflow-hidden border border-border ${className}`}
      />
    </MapErrorBoundary>
  );
}

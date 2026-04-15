import { useEffect, useRef, useState } from "react";
import type mapboxgl from "mapbox-gl";
import { loadMapbox, getMapboxgl } from "@/lib/mapbox/mapbox-loader";
import { MAPBOX_ACCESS_TOKEN, getMapboxTokenError } from "@/lib/mapbox/config";
import MapErrorFallback from "@/components/map/MapErrorFallback";
import { MapErrorBoundary } from "@/components/map/MapErrorBoundary";
import { MapPin } from "lucide-react";

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

  useEffect(() => {
    if (!containerRef.current) return;

    const tokenError = getMapboxTokenError();
    if (tokenError) {
      setMapError(tokenError);
      return;
    }

    let cancelled = false;
    setMapError(null);

    if (!MAPBOX_ACCESS_TOKEN?.trim()) {
      setMapError("Mapbox access token is not configured.");
      return;
    }

    loadMapbox().then((mapboxgl) => {
      if (cancelled || !containerRef.current) return;
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
          const msg = (e.error?.message || String(e.error ?? "")).toLowerCase();
          if (msg.includes("401") || msg.includes("403") || msg.includes("access token") || msg.includes("unauthorized")) {
            setMapError("Mapbox access token is invalid or expired.");
          }
        });

        map.on("load", () => {
          if (!cancelled) setMapReady(true);
        });
      } catch (err: unknown) {
        setMapError(err instanceof Error ? err.message : "Map initialization failed");
      }
    }).catch((err: unknown) => {
      if (!cancelled) setMapError(err instanceof Error ? err.message : "Failed to load map");
    });

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      setMapReady(false);
    };
  }, []);

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
      <MapErrorFallback
        message={mapError}
        className={`w-full h-[400px] ${className}`}
      />
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

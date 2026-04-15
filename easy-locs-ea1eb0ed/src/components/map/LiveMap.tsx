import { useEffect, useRef, useState } from "react";
import type mapboxgl from "mapbox-gl";
import { loadMapbox, getMapboxgl } from "@/lib/mapbox/mapbox-loader";
import { MAPBOX_ACCESS_TOKEN } from "@/lib/mapbox/config";
import MapErrorFallback from "@/components/map/MapErrorFallback";

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
    let cancelled = false;
    setMapError(null);

    if (!MAPBOX_ACCESS_TOKEN?.trim()) {
      setMapError("Mapbox access token is not configured.");
      return;
    }

    loadMapbox().then((mapboxgl) => {
      if (cancelled || !containerRef.current) return;
      mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;

      let map: mapboxgl.Map;
      try {
        map = new mapboxgl.Map({
          container: containerRef.current,
          style: "mapbox://styles/mapbox/dark-v11",
          center: [center[1], center[0]],
          zoom,
          attributionControl: false,
        });
      } catch (err: unknown) {
        setMapError(err instanceof Error ? err.message : "Map initialization failed");
        return;
      }

      mapRef.current = map;

      map.on("error", (e) => {
        const msg = ((e.error?.message as string) ?? "").toLowerCase();
        if (msg.includes("access token") || msg.includes("unauthorized") || msg.includes("401")) {
          setMapError("Mapbox access token is invalid or expired.");
        }
      });

      map.on("load", () => {
        if (!cancelled) setMapReady(true);
      });
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

    if (showRoute && points.length > 1) {
      const sourceId = "live-route";
      if (map.getSource(sourceId)) {
        (map.getSource(sourceId) as mapboxgl.GeoJSONSource).setData({
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: points.map((p) => [p.lng, p.lat]),
          },
        });
      } else {
        map.on("load", () => {
          if (map.getSource(sourceId)) return;
          map.addSource(sourceId, {
            type: "geojson",
            data: {
              type: "Feature",
              properties: {},
              geometry: {
                type: "LineString",
                coordinates: points.map((p) => [p.lng, p.lat]),
              },
            },
          });
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
        });
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
    <div
      ref={containerRef}
      className={`w-full h-[400px] rounded-xl overflow-hidden border border-border ${className}`}
    />
  );
}
